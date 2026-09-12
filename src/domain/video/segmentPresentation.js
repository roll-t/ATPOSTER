const ACT_METADATA = {
  1: { label: 'HỒI 1: KHỞI NGUỒN & BỐI CẢNH', jp: '第一幕：発端', icon: '🏛️', color: '#f59e0b' },
  2: { label: 'HỒI 2: DIỄN BIẾN & ĐỐI ĐẦU', jp: '第二幕：動乱', icon: '⚔️', color: '#3b82f6' },
  3: { label: 'HỒI 3: CAO TRÀO & BƯỚC NGOẶT', jp: '第三幕：激突', icon: '🔥', color: '#ef4444' },
  4: { label: 'HỒI 4: KẾT QUẢ & CỤC DIỆN MỚI', jp: '第四幕：結末', icon: '⚖️', color: '#10b981' },
  5: { label: 'HỒI 5: DƯ ÂM & BÀI HỌC LỊCH SỬ', jp: '第五幕：残響', icon: '🍃', color: '#a855f7' },
};

export function getSegmentActMeta(segment) {
  let act = segment?.act ? Number(segment.act) : null;
  const subtitle = segment?.subtitle || '';
  if (!act) {
    if (/第一幕|Hồi (?:1|I)\b/.test(subtitle)) act = 1;
    else if (/第二幕|Hồi (?:2|II)\b/.test(subtitle)) act = 2;
    else if (/第三幕|Hồi (?:3|III)\b/.test(subtitle)) act = 3;
    else if (/第四幕|Hồi (?:4|IV)\b/.test(subtitle)) act = 4;
    else if (/第五幕|Hồi (?:5|V)\b/.test(subtitle)) act = 5;
  }
  return act ? ACT_METADATA[act] || null : null;
}

export function isSelfContainedStickFigureSlide(slide) {
  if (!slide) return false;
  return (
    (Array.isArray(slide.elements) && slide.elements.length > 0)
    || slide.layout === 'bullets'
    || (Array.isArray(slide.bullets) && slide.bullets.length > 0)
    || (Array.isArray(slide.elements) && !slide.visualDescription)
  );
}
