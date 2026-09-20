const VIETNAMESE_MARKS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const ENGLISH_PROMPT_NOISE = new Set([
  'a', 'an', 'the', 'and', 'with', 'of', 'on', 'in', 'at', 'to', 'from',
  'simple', 'minimal', 'minimalist', 'smooth', 'blank', 'clean', 'bright',
  'background', 'panel', 'scene', 'image', 'illustration', 'drawing', 'drawn',
  'style', 'cinematic', 'realistic', 'high', 'quality', 'detailed', 'soft',
  'light', 'grey', 'gray', 'blue', 'white', 'black', 'color', 'coloured',
  'colored', '2d', '3d', 'stick', 'figure', 'line', 'art'
]);

function includesAny(text, words) {
  return words.some(word => text.includes(word));
}

function extractConciseEnglishQuery(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !ENGLISH_PROMPT_NOISE.has(word));

  return [...new Set(words)].slice(0, 6).join(' ');
}

/**
 * Tạo truy vấn dự phòng tức thì trước khi AI trả về từ khóa tối ưu.
 * Lời thoại luôn được ưu tiên hơn prompt tạo hình vì nó mới là chủ đề cảnh đang nói tới.
 */
export function derivePexelsSceneKeyword(input, supportingText = '') {
  const narration = typeof input === 'object'
    ? String(input?.narration || input?.sceneNarration || '')
    : String(input || '');
  const visualPrompt = typeof input === 'object'
    ? String(input?.visualPrompt || input?.scenePrompt || '')
    : String(supportingText || '');
  const clean = `${narration} ${visualPrompt}`.trim().toLowerCase();

  if (!clean) return 'person daily life';

  const mentionsFriends = includesAny(clean, ['bạn bè', 'friends', 'friend']);
  if (includesAny(clean, ['facebook', 'tiktok', 'mạng xã hội', 'social media', 'news feed', 'thuật toán'])) {
    if (mentionsFriends) return 'friends using social media phone';
    return 'person using social media phone';
  }
  if (includesAny(clean, ['điện thoại', 'smartphone', 'phone', 'màn hình', 'mobile app', 'online'])) {
    return 'person using smartphone screen';
  }
  if (includesAny(clean, ['máy tính', 'laptop', 'bàn phím', 'keyboard', 'gõ phím', 'coding', 'code'])) {
    return 'person typing on laptop';
  }
  if (includesAny(clean, ['trí tuệ nhân tạo', 'artificial intelligence', ' ai ', 'robot', 'công nghệ'])) {
    return 'artificial intelligence technology screen';
  }
  if (includesAny(clean, ['tiền', 'tài chính', 'finance', 'kinh doanh', 'business', 'đầu tư', 'stock market'])) {
    return 'person analyzing financial market';
  }
  if (includesAny(clean, ['gia đình', 'family', 'cha mẹ', 'mother', 'father', 'con cái'])) {
    return 'family spending time together';
  }
  if (includesAny(clean, ['bạn bè', 'friends', 'nói chuyện', 'conversation'])) {
    return 'friends talking together';
  }
  if (includesAny(clean, ['áp lực', 'mệt mỏi', 'stress', 'suy nghĩ', 'thinking', 'buồn', 'cô đơn', 'thất vọng', 'bế tắc'])) {
    return 'stressed person thinking alone';
  }
  if (includesAny(clean, ['thành phố', 'đường phố', 'city', 'traffic', 'xe cộ', 'phố xá', 'dòng người'])) {
    return 'people walking city street';
  }
  if (includesAny(clean, ['thiên nhiên', 'rừng', 'forest', 'cây', 'núi', 'mountain', 'phong cảnh'])) {
    return 'person walking in nature';
  }
  if (includesAny(clean, ['biển', 'ocean', 'sóng', 'waves', 'bờ biển', 'beach', 'hồ'])) {
    return 'person walking ocean beach';
  }
  if (includesAny(clean, ['mưa', 'rain', 'cửa sổ', 'window', 'giọt nước', 'bão'])) {
    return 'person looking through rainy window';
  }
  if (includesAny(clean, ['cà phê', 'coffee', 'sách', 'book', 'đọc sách', 'quán cafe'])) {
    return 'person reading book cafe';
  }
  if (includesAny(clean, ['chạy bộ', 'running', 'thể thao', 'sport', 'tập luyện', 'gym'])) {
    return 'person running outdoors';
  }

  // Lấy chủ thể/hành động thật từ prompt tiếng Anh nhưng bỏ các từ mô tả phong cách
  // (stick figure, 2D, màu nền...) vì chúng làm kết quả Pexels lệch chủ đề.
  const englishSource = VIETNAMESE_MARKS.test(visualPrompt) ? '' : visualPrompt;
  const extracted = extractConciseEnglishQuery(englishSource || (VIETNAMESE_MARKS.test(narration) ? '' : narration));
  return extracted || 'person daily life';
}

export function pickPexelsVideoFile(item, orientation) {
  const files = (item?.video_files || []).filter(file => file?.link && file.file_type === 'video/mp4');
  const wantsPortrait = orientation === 'portrait';
  const wantsLandscape = orientation === 'landscape';
  return [...files].sort((a, b) => {
    const score = (file) => {
      const width = Number(file.width) || 0;
      const height = Number(file.height) || 0;
      const orientationMatch = (!wantsPortrait && !wantsLandscape)
        || (wantsPortrait && height >= width)
        || (wantsLandscape && width >= height);
      const longEdge = Math.max(width, height);
      const usableResolution = longEdge >= 720 && longEdge <= 1920;
      return (orientationMatch ? 1000 : 0)
        + (usableResolution ? 300 : 0)
        + (file.quality === 'hd' ? 100 : 0)
        - Math.abs(longEdge - 1080) / 10;
    };
    return score(b) - score(a);
  })[0] || null;
}
