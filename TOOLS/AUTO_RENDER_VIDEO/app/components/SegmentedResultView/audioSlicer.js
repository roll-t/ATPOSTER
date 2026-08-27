/**
 * Cắt một file giọng đọc DÀI (ElevenLabs trả về 1 file cho mỗi lần render TTS) thành từng đoạn
 * theo slide, chạy HOÀN TOÀN TRONG TRÌNH DUYỆT.
 *
 * Vì sao phải có bước này: Remotion tính thời lượng mỗi slide bằng độ dài file audio CỦA CHÍNH
 * SLIDE ĐÓ (xem getAudioDurationInSeconds trong skills/<skill>/remotion/src/Root.tsx) và mỗi slide render
 * một thẻ <Audio> riêng. Nghĩa là pipeline bắt buộc phải có N file scene-NN rời. ElevenLabs bản web
 * thì chỉ trả về 1 file dài cho mỗi lượt render (trần 5.000 ký tự), nên thiếu đúng bước cắt này.
 *
 * Vì sao cắt ở trình duyệt chứ không ở server: máy không có ffmpeg (data/ffmpeg.exe chưa tải, PATH
 * cũng không có) và tích hợp API ElevenLabs đã bị gỡ khỏi tool. Web Audio API có sẵn decodeAudioData
 * cho mp3, còn WAV thì tự ghi header được — không phải cài thêm gì. render-project.mjs dò đuôi file
 * thật (`match.split(".").pop()`) nên xuất .wav chạy bình thường, không bị khoá cứng .mp3.
 */

/** Giải mã file người dùng thả vào thành AudioBuffer. */
export async function decodeAudioFile(file) {
  const bytes = await file.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(bytes);
  } finally {
    // Chrome giới hạn số AudioContext sống cùng lúc; thả 2-3 file liên tiếp mà không đóng là
    // decode file sau sẽ ném lỗi khó hiểu.
    ctx.close();
  }
}

/** Trộn mọi kênh về mono — dò khoảng lặng và ghi file đều chỉ cần 1 kênh. */
function toMono(audioBuffer) {
  const { numberOfChannels, length } = audioBuffer;
  if (numberOfChannels === 1) return audioBuffer.getChannelData(0);

  const out = new Float32Array(length);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) out[i] += data[i];
  }
  for (let i = 0; i < length; i++) out[i] /= numberOfChannels;
  return out;
}

const FRAME_MS = 20;

/** Mức âm lượng (dBFS) của từng khung 20ms. */
function frameLevels(samples, sampleRate) {
  const frameSize = Math.max(1, Math.round((sampleRate * FRAME_MS) / 1000));
  const count = Math.floor(samples.length / frameSize);
  const levels = new Float32Array(count);

  for (let f = 0; f < count; f++) {
    let sum = 0;
    const from = f * frameSize;
    for (let i = from; i < from + frameSize; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / frameSize);
    // -120 dB làm sàn để log10(0) không ra -Infinity rồi lan ra mọi phép so sánh sau đó.
    levels[f] = rms > 0 ? 20 * Math.log10(rms) : -120;
  }
  return { levels, frameSeconds: frameSize / sampleRate };
}

/**
 * Các quãng lặng dài hơn minSilenceMs, tính bằng giây.
 *
 * Trả về cả `mid`: điểm cắt nên nằm GIỮA quãng lặng, không nằm ở mép. Cắt sát mép thì đoạn trước
 * bị cụt đuôi hơi hoặc đoạn sau mở đầu bằng một tiếng "phựt".
 */
export function detectSilences(levels, frameSeconds, { thresholdDb, minSilenceMs }) {
  const minFrames = Math.max(1, Math.round(minSilenceMs / FRAME_MS));
  const silences = [];
  let runStart = -1;

  for (let f = 0; f <= levels.length; f++) {
    const isQuiet = f < levels.length && levels[f] < thresholdDb;
    if (isQuiet) {
      if (runStart < 0) runStart = f;
      continue;
    }
    if (runStart >= 0) {
      const runFrames = f - runStart;
      if (runFrames >= minFrames) {
        const start = runStart * frameSeconds;
        const end = f * frameSeconds;
        silences.push({ start, end, mid: (start + end) / 2, duration: end - start });
      }
      runStart = -1;
    }
  }
  return silences;
}

// Quãng lặng dài từ mức này trở lên được coi là chỗ NGẮT ĐOẠN thật (giữa hai slide), ngắn hơn thì
// nhiều khả năng chỉ là lấy hơi giữa câu. Đo trên file ElevenLabs thật: chỗ ngắt đoạn khoảng
// 0,5-0,9 giây, còn hơi thở giữa câu quanh 0,2-0,3 giây.
const FULL_PAUSE_SECONDS = 0.5;

// Giá phải trả khi buộc phải cắt vào một quãng lặng ngắn ngủn. Đặt 0.6 nghĩa là: thà lệch thời
// điểm kỳ vọng khoảng 0,8 lần độ dài một slide còn hơn cắt vào một hơi thở.
const SHORT_PAUSE_PENALTY = 0.6;

/**
 * Chọn đúng (n-1) điểm cắt từ danh sách quãng lặng dò được — bằng QUY HOẠCH ĐỘNG.
 *
 * Bản đầu tiên chọn THAM LAM: duyệt từng ranh giới, lấy quãng lặng gần thời điểm kỳ vọng nhất, rồi
 * khoá luôn. Hỏng ở hai điểm, và đã thấy hỏng thật trên file 135 slide:
 *
 *   1. Sai một lần là sai dây chuyền. Chọn nhầm một hơi thở cho ranh giới k thì mọi ranh giới sau
 *      đó bị đẩy lệch theo, không có đường lùi.
 *   2. Nó bỏ qua ĐỘ DÀI quãng lặng. Một hơi thở 0,26 giây tình cờ nằm gần thời điểm kỳ vọng sẽ
 *      thắng một chỗ ngắt đoạn thật 0,7 giây nằm xa hơn chút — trong khi chỗ ngắt đoạn mới là ranh
 *      giới slide thật sự.
 *
 * Quy hoạch động tối ưu TOÀN CỤC nên không có chuyện sai dây chuyền, và hàm chi phí cộng thêm phần
 * thưởng cho quãng lặng dài nên chỗ ngắt đoạn thật luôn được ưu tiên.
 *
 * Chi phí của việc đặt ranh giới thứ k vào quãng lặng i:
 *   (lệch thời gian / độ dài một slide)²  +  phạt nếu quãng lặng ngắn
 *
 * Độ phức tạp O(K×N), không phải O(K×N²): chi phí không phụ thuộc lựa chọn TRƯỚC đó, nên chỉ cần
 * giữ giá trị nhỏ nhất chạy dồn của mức k-1 thay vì quét lại toàn bộ.
 */
export function pickBoundaryIndexes(silences, weights, totalDuration) {
  const needed = weights.length - 1;
  if (needed <= 0) return [];
  if (silences.length < needed) return null;

  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const expected = [];
  let acc = 0;
  for (let i = 0; i < needed; i++) {
    acc += weights[i];
    expected.push((acc / totalWeight) * totalDuration);
  }

  // Thước đo độ lệch: một slide trung bình. Lệch đúng một slide thì chi phí thời gian bằng 1.
  const slideSeconds = Math.max(0.5, totalDuration / (needed + 1));
  const n = silences.length;

  const costAt = (k, i) => {
    const drift = (silences[i].mid - expected[k]) / slideSeconds;
    const shortness = 1 - Math.min(1, silences[i].duration / FULL_PAUSE_SECONDS);
    return drift * drift + SHORT_PAUSE_PENALTY * shortness;
  };

  let prev = new Float64Array(n).fill(Infinity);
  const backLevels = [];

  for (let k = 0; k < needed; k++) {
    const cur = new Float64Array(n).fill(Infinity);
    const back = new Int32Array(n).fill(-1);
    let bestPrev = Infinity;
    let bestPrevIndex = -1;

    for (let i = 0; i < n; i++) {
      if (k === 0) {
        cur[i] = costAt(0, i);
      } else {
        // bestPrev đang là min của mức k-1 trên mọi j < i — đúng ràng buộc "ranh giới phải tăng dần".
        if (prev[i - 1] < bestPrev) { bestPrev = prev[i - 1]; bestPrevIndex = i - 1; }
        if (bestPrevIndex >= 0) {
          cur[i] = bestPrev + costAt(k, i);
          back[i] = bestPrevIndex;
        }
      }
    }
    backLevels.push(back);
    prev = cur;
  }

  let end = -1;
  let bestTotal = Infinity;
  for (let i = 0; i < n; i++) {
    if (prev[i] < bestTotal) { bestTotal = prev[i]; end = i; }
  }
  if (end < 0 || !Number.isFinite(bestTotal)) return null;

  const chosen = new Array(needed);
  for (let k = needed - 1; k >= 0; k--) {
    chosen[k] = end;
    end = backLevels[k][end];
  }
  return chosen;
}

// Quét từ nghiêm tới lỏng. Giọng ElevenLabs rất sạch nên -50 dB thường đã ăn; các ngưỡng lỏng hơn
// dành cho file có nhiễu nền hoặc đã qua một lớp nén/normalize nào đó.
const THRESHOLDS_DB = [-50, -45, -40, -36, -32];
const MIN_SILENCE_MS = [600, 450, 350, 260, 200];

// Cần bao nhiêu ứng viên thì bộ chọn mới thực sự có quyền lựa. Vừa khít số chỗ cắt nghĩa là KHÔNG
// có lựa chọn nào cả: mọi quãng lặng dò được đều buộc phải dùng, kể cả hơi thở giữa câu.
const CANDIDATE_SURPLUS = 1.6;

/**
 * Dò quãng lặng rồi chọn điểm cắt.
 *
 * Bản đầu tiên lấy tổ hợp tham số NGHIÊM NHẤT mà vừa đủ số chỗ cắt. Nghe hợp lý nhưng sai: "vừa đủ"
 * đồng nghĩa với "không còn gì để chọn". Đo trên file thật 135 slide — nó phải nới xuống tận
 * 260ms mới gom đủ 134 chỗ, mà 260ms là quãng LẤY HƠI GIỮA CÂU, nên nhiều lát bị cắt ngay giữa
 * câu đang đọc dở.
 *
 * Giờ làm ngược lại: gom một RỔ ỨNG VIÊN DƯ DẢ rồi để quy hoạch động chấm điểm và loại bớt. Hơi
 * thở lọt vào rổ không còn nguy hiểm — nó thua điểm ngay ở phần phạt quãng lặng ngắn.
 */
export function autoDetectBoundaries(audioBuffer, weights) {
  const samples = toMono(audioBuffer);
  const { levels, frameSeconds } = frameLevels(samples, audioBuffer.sampleRate);
  const needed = weights.length - 1;
  const total = audioBuffer.duration;

  if (needed <= 0) return { silences: [], indexes: [], settings: null, needed: 0 };

  const wanted = Math.ceil(needed * CANDIDATE_SURPLUS);
  let best = null;

  for (const minSilenceMs of MIN_SILENCE_MS) {
    for (const thresholdDb of THRESHOLDS_DB) {
      const silences = detectSilences(levels, frameSeconds, { thresholdDb, minSilenceMs });
      // Giữ lại tổ hợp cho NHIỀU ứng viên nhất, phòng khi không tổ hợp nào đạt mức dư mong muốn.
      if (!best || silences.length > best.silences.length) {
        best = { silences, settings: { thresholdDb, minSilenceMs } };
      }
      if (silences.length >= wanted) {
        const indexes = pickBoundaryIndexes(silences, weights, total);
        if (indexes) return { silences, indexes, settings: { thresholdDb, minSilenceMs }, needed };
      }
    }
  }

  // Không tổ hợp nào dư dả — vẫn thử với rổ lớn nhất gom được, miễn là đủ số chỗ cắt.
  if (best && best.silences.length >= needed) {
    const indexes = pickBoundaryIndexes(best.silences, weights, total);
    if (indexes) return { silences: best.silences, indexes, settings: best.settings, needed };
  }

  // Thiếu thật — trả về những gì dò được để giao diện nói thẳng là thiếu bao nhiêu.
  return {
    silences: best ? best.silences : [],
    indexes: null,
    settings: best ? best.settings : null,
    needed,
  };
}

/** Cắt đều theo tỉ lệ số ký tự — phương án dự phòng khi không dò đủ quãng lặng. */
export function proportionalBoundaries(weights, totalDuration) {
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const out = [];
  let acc = 0;
  for (let i = 0; i < weights.length - 1; i++) {
    acc += weights[i];
    out.push((acc / totalWeight) * totalDuration);
  }
  return out;
}

/** Đổi danh sách điểm cắt thành các lát [start, end]. */
export function slicesFromBoundaries(boundaries, totalDuration) {
  const points = [0, ...boundaries, totalDuration];
  const slices = [];
  for (let i = 0; i < points.length - 1; i++) {
    slices.push({ start: points[i], end: points[i + 1] });
  }
  return slices;
}

/**
 * Ghi một lát thành WAV 16-bit mono.
 *
 * Giữ nguyên sampleRate của file gốc: hạ tần số xuống cho nhẹ sẽ làm giọng đục đi, mà 52 file WAV
 * của một video 9 phút cũng chỉ khoảng 45 MB nằm ngay trên ổ đĩa nội bộ.
 */
export function encodeWavSlice(audioBuffer, startSec, endSec) {
  const samples = toMono(audioBuffer);
  const rate = audioBuffer.sampleRate;
  const from = Math.max(0, Math.floor(startSec * rate));
  const to = Math.min(samples.length, Math.ceil(endSec * rate));
  const count = Math.max(0, to - from);

  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const writeText = (offset, text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + count * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);        // độ dài khối fmt
  view.setUint16(20, 1, true);         // PCM
  view.setUint16(22, 1, true);         // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);  // byte/giây
  view.setUint16(32, 2, true);         // byte/khung
  view.setUint16(34, 16, true);        // bit/mẫu
  writeText(36, 'data');
  view.setUint32(40, count * 2, true);

  let offset = 44;
  for (let i = from; i < to; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function formatSeconds(value) {
  const total = Math.max(0, Math.round(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
