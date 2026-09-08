/**
 * Phần TÍNH TOÁN dùng chung cho mọi dòng prompt video nhiều clip (craftAsmr.js, cozyStopMotion.js).
 *
 * Chỉ chứa toán học thuần: chia thời lượng theo trọng số hồi, cắt hồi vào từng clip, làm tròn mốc
 * giây. KHÔNG chứa một chữ nội dung nào — nội dung (tên hồi, luật nhất quán, schema gửi Gemini) là
 * việc của từng module phong cách.
 *
 * Vì sao tách: hai dòng prompt dùng CHUNG một khuôn thời gian (4 hồi, ranh giới clip luôn trùng
 * ranh giới hồi, mốc giây tính lại từ 0 cho từng clip). Nếu mỗi bên giữ một bản sao thì chỉ cần
 * sửa cách chia thời lượng ở một bên là hai dòng video lệch nhịp nhau mà không ai phát hiện ra.
 */

/** Bỏ ".0" thừa cho gọn mắt: 3.5 -> "3.5", 5.0 -> "5". Dùng cho tiêu đề cảnh. */
export function fmt(n) {
  return Number(n.toFixed(2)).toString();
}

/** Luôn giữ 1 chữ số thập phân: 5 -> "5.0". Dùng cho các mốc nhỏ bên trong một hồi. */
export function fmt1(n) {
  return n.toFixed(1);
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Bản kế hoạch đầy đủ: mỗi clip gồm những hồi nào, mỗi hồi dài bao nhiêu giây (tính từ giây 0 của
 * CHÍNH clip đó) và cần bao nhiêu nhịp.
 *
 * @param acts          {A: {kind, weight, ...}} — định nghĩa hồi của phong cách gọi tới.
 * @param clipPlans     {1: [[...]], 2: [[...], [...]], ...} — hồi nào rơi vào clip nào.
 * @param beatCountsFor (actKey, seconds) => số nhịp. Trả 0 cho hồi dạng đoạn văn.
 * @param beatKeys      những hồi cần cộng dồn tổng số nhịp (để nói với Gemini cần viết bao nhiêu câu).
 */
export function buildClipPlan({
  acts,
  clipPlans,
  beatCountsFor,
  beatKeys = [],
  durationSeconds,
  clipCount,
  defaultDuration = 10,
}) {
  const clipDuration = Number(durationSeconds) || defaultDuration;
  const count = clipPlans[clipCount] ? Number(clipCount) : 1;
  const groups = clipPlans[count];

  const clips = groups.map((actKeys, clipIndex) => {
    const totalWeight = actKeys.reduce((sum, k) => sum + acts[k].weight, 0);
    let cursor = 0;

    const builtActs = actKeys.map((key) => {
      const seconds = (acts[key].weight / totalWeight) * clipDuration;
      const act = {
        ...acts[key],
        key,
        from: cursor,
        to: cursor + seconds,
        seconds,
        beatCount: acts[key].kind === 'paragraph' ? 0 : beatCountsFor(key, seconds),
      };
      cursor += seconds;
      return act;
    });

    return {
      index: clipIndex + 1,
      actKeys,
      acts: builtActs,
      duration: clipDuration,
      globalFrom: clipIndex * clipDuration,
      globalTo: (clipIndex + 1) * clipDuration,
      /** Hồi cuối của clip quyết định "khung hình cuối" trông như thế nào. */
      endsAfterAct: actKeys[actKeys.length - 1],
      startsAtAct: actKeys[0],
    };
  });

  const totals = {};
  for (const key of beatKeys) {
    totals[key] = clips.reduce((s, c) => s + (c.acts.find((a) => a.key === key)?.beatCount || 0), 0);
  }

  return {
    clipDuration,
    clipCount: count,
    totalDuration: clipDuration * count,
    clips,
    totals,
  };
}

/** Hồi cuối của clip liền trước — dùng để lấy trạng thái khung mở đầu của clip hiện tại. */
export function previousEndAct(plan, clip, fallback) {
  const prev = plan.clips[clip.index - 2];
  return prev ? prev.endsAfterAct : fallback;
}

/**
 * Chia một danh sách nhịp dùng chung cho cả video về đúng phần của từng clip.
 * Gemini trả về một mảng phẳng cho toàn video; hàm này cắt đúng khúc thuộc về clip đang dựng.
 */
export function sliceBeats(allBeats, plan, actKey, clipIndex) {
  const list = Array.isArray(allBeats) ? allBeats.filter((b) => String(b || '').trim()) : [];
  let cursor = 0;
  for (const clip of plan.clips) {
    const act = clip.acts.find((a) => a.key === actKey);
    if (!act) continue;
    if (clip.index === clipIndex) return list.slice(cursor, cursor + act.beatCount);
    cursor += act.beatCount;
  }
  return [];
}

/** Cắt/đệm một mảng cho đủ n phần tử, bỏ phần tử rỗng. */
export function fitBeats(arr, n) {
  const list = Array.isArray(arr) ? arr.filter((x) => String(x || '').trim()) : [];
  return Array.from({ length: n }, (_, i) => String(list[i] || '').trim()).filter(Boolean);
}

/** Bỏ dấu chấm cuối cho các chuỗi sẽ được NHÚNG GIỮA CÂU (trong ngoặc, hoặc trước dấu chấm của khung). */
export function inlineText(v, fallback = '') {
  return String(v ?? fallback)
    .trim()
    .replace(/\s*[.。]+\s*$/, '');
}
