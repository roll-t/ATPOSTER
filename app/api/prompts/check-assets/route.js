import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/src/infrastructure/rendering/remotion/paths.js';
import { createSilentMp3Buffer, createSilentWavBuffer } from '@/src/infrastructure/tts/silence.js';

export async function POST(req) {
  try {
    const { folderPath, category } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    const targetDir = resolveProjectDir(cleanFolder, category);
    const imagesDir = path.join(targetDir, 'images');
    const audioDir = path.join(targetDir, 'audio');

    let imageCount = 0;
    const existingImageNumbers = [];
    const existingVideoNumbers = [];
    const mediaTypes = {};

    if (fs.existsSync(imagesDir)) {
      const allMediaFiles = fs.readdirSync(imagesDir).filter(f =>
        f.startsWith('scene-') && (
          f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp') ||
          f.endsWith('.mp4') || f.endsWith('.webm')
        )
      );
      imageCount = allMediaFiles.length;
      for (const f of allMediaFiles) {
        const m = f.match(/^scene-(\d+)\.(jpg|png|webp|mp4|webm)$/i);
        if (m) {
          const num = Number(m[1]);
          const ext = m[2].toLowerCase();
          const isVid = ext === 'mp4' || ext === 'webm';
          if (!existingImageNumbers.includes(num)) {
            existingImageNumbers.push(num);
          }
          if (isVid) {
            if (!existingVideoNumbers.includes(num)) existingVideoNumbers.push(num);
            mediaTypes[num] = 'video';
          } else if (!mediaTypes[num]) {
            mediaTypes[num] = 'image';
          }
        }
      }
      existingImageNumbers.sort((a, b) => a - b);
      existingVideoNumbers.sort((a, b) => a - b);
    }

    // Giọng đọc từng slide KHÔNG phải lúc nào cũng là .mp3. Giọng do app tự tạo (Edge/CapCut) ra
    // .mp3, nhưng luồng lồng tiếng ngoài cắt file ElevenLabs ngay trong trình duyệt thì ghi ra
    // .wav (xem audioSlicer.js — trình duyệt giải mã được mp3 nhưng không encode lại được mp3),
    // và người dùng chép tay vào cũng có thể là .m4a. Bản trước chỉ đếm .mp3 nên 52 file .wav ghi
    // thành công vẫn cho audioCount = 0, khiến nút Render không bao giờ mở dù dữ liệu đã đủ.
    //
    // render-project.mjs vốn đã dò đuôi thật (`match.split('.').pop()`), nên chỗ ĐẾM này mới là
    // nơi duy nhất còn gắn cứng .mp3.
    const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.aac'];

    // Tự động bù file âm thanh khoảng lặng cho các slide không có lời thoại (ví dụ slide tiêu đề hồi chapter-title)
    // nếu các slide có thoại khác đã có audio trên đĩa. Giúp luồng lồng tiếng ngoài (ElevenLabs) hoặc copy thủ công
    // không bị kẹt vì thiếu file audio ở những slide vốn dĩ không có giọng đọc.
    const manifestFile = path.join(targetDir, 'manifest.json');
    if (fs.existsSync(manifestFile)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
        if (Array.isArray(manifest.segments) && fs.existsSync(audioDir)) {
          const existingAudioFiles = fs.readdirSync(audioDir);
          const hasAnyAudio = existingAudioFiles.some(f => f.startsWith('scene-') && AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));

          if (hasAnyAudio) {
            const firstAudio = existingAudioFiles.find(f => f.startsWith('scene-') && AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));
            const preferredExt = firstAudio ? path.extname(firstAudio).toLowerCase() : '.wav';

            for (const seg of manifest.segments) {
              const segNum = Number(seg.segmentNumber);
              const text = (seg.dialogueOrNarration || '').replace(/^[A-Za-z0-9\s]+:\s*/, '').trim();
              const isSilentSlide = !text || seg.layout === 'chapter-title';
              if (isSilentSlide && Number.isFinite(segNum) && !seg.isThumbnail) {
                const pad = String(segNum).padStart(2, '0');
                const hasFile = existingAudioFiles.some(f => f.startsWith(`scene-${pad}.`) && AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));
                if (!hasFile) {
                  const silenceSeconds = Number(seg.durationSeconds) || (seg.layout === 'chapter-title' ? 3 : 3);
                  const silentBuffer = preferredExt === '.mp3'
                    ? createSilentMp3Buffer(silenceSeconds)
                    : createSilentWavBuffer(silenceSeconds);
                  fs.writeFileSync(path.join(audioDir, `scene-${pad}${preferredExt}`), silentBuffer);
                }
              }
            }
          }
        }
      } catch (_) {
        // Không làm hỏng flow check-assets nếu manifest lỗi
      }
    }

    let audioCount = 0;
    // Đuôi THẬT của file giọng đọc trên đĩa — trả về để giao diện xin đúng tên khi nghe thử,
    // thay vì đoán 'mp3' rồi nhận 404.
    let audioExt = null;
    const existingAudioNumbers = [];
    const audioFiles = {};
    if (fs.existsSync(audioDir)) {
      const sceneAudio = fs.readdirSync(audioDir)
        .filter(f => f.startsWith('scene-') && AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));
      for (const filename of sceneAudio) {
        const match = filename.match(/^scene-(\d+)\.(mp3|wav|m4a|ogg|aac)$/i);
        if (!match) continue;
        const sceneNumber = Number(match[1]);
        if (!Number.isFinite(sceneNumber) || audioFiles[sceneNumber]) continue;
        existingAudioNumbers.push(sceneNumber);
        audioFiles[sceneNumber] = filename;
      }
      existingAudioNumbers.sort((a, b) => a - b);
      audioCount = existingAudioNumbers.length;
      if (sceneAudio.length > 0) audioExt = path.extname(sceneAudio[0]).slice(1).toLowerCase();
    }

    // targetDir (đã resolve ở trên qua resolveProjectDir) đã tự tìm đúng vị trí thật của
    // project — dù ở vị trí phẳng cũ hay lồng theo category mới — nên chỉ cần kiểm tra
    // final/video.mp4 ngay trong đó, không cần tự dò lại từ đầu qua từng skill.
    const videoCreated = fs.existsSync(path.join(targetDir, 'final', 'video.mp4'));

    // Nhạc nền (tuỳ chọn, người dùng tự tải lên qua Studio Thiết Kế Trang Đọc Video) — chỉ
    // reading-page-video có tính năng này, nhưng kiểm tra vô hại cho category khác.
    // Trả về cả TÊN FILE thật (bg-music.mp3 / .m4a / .wav...) chứ không chỉ true/false: trình
    // nghe thử trong modal cần đúng đuôi file để phát, trước đây nó gắn cứng ".mp3" nên nhạc nền
    // người dùng tải lên ở định dạng khác thì không nghe thử được dù đã áp dụng thành công.
    let bgMusicFile = null;
    if (fs.existsSync(audioDir)) {
      bgMusicFile = fs.readdirSync(audioDir).find(f => f.startsWith('bg-music.')) || null;
    }

    const bgDir = path.join(targetDir, 'bg');
    let hasBgVideo = false;
    // Số hiệu các đoạn ĐÃ có nền riêng ("seg-bg-NN.mp4") trên đĩa. Giao diện giữ thông tin gán nền
    // trong state React nên tải lại trang là mất; trả về đây để dựng lại được trạng thái thật.
    const segmentBgNumbers = [];
    if (fs.existsSync(bgDir)) {
      const files = fs.readdirSync(bgDir);
      hasBgVideo = files.some(f => f.endsWith('.mp4') || f.endsWith('.webm'));
      for (const f of files) {
        const m = f.match(/^seg-bg-(\d+)\.(mp4|webm)$/);
        if (m) segmentBgNumbers.push(Number(m[1]));
      }
      segmentBgNumbers.sort((a, b) => a - b);
    }

    return NextResponse.json({
      success: true,
      imageCount,
      existingImageNumbers,
      existingVideoNumbers,
      mediaTypes,
      audioCount,
      audioExt,
      existingAudioNumbers,
      audioFiles,
      videoCreated,
      hasBgMusic: Boolean(bgMusicFile),
      bgMusicFile,
      hasBgVideo,
      segmentBgNumbers
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
