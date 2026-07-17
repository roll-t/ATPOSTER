// Danh mục các phong cách tạo ẢNH dùng chung cho mọi chủ đề ảnh (type: 'image').
// Người dùng chọn 1 phong cách ngay trong form, hệ thống ghép phong cách đó với mô tả
// nhân vật/chủ thể (style-neutral, không gắn cứng vào 1 kiểu vẽ) để ra prompt hoàn chỉnh.
// Xem buildImagePrompt.js để biết cách ghép.
export const IMAGE_STYLES = {
  stick_figure: {
    key: 'stick_figure',
    label: 'Người Que (Whiteboard)',
    icon: '🧍',
    description: 'Nét vẽ tay đen trắng tối giản, đầu tròn, thân/tay chân chỉ MỘT nét line duy nhất — đúng phong cách video người que của kênh.',
    visualStyle: 'Minimalist whiteboard-animation style, hand-drawn black ink stick figures on a plain white background. Draw every character with the same simple, consistent construction: a round circle for the head, with a small clean face that is never left blank — two small simple dot or oval eyes, plus a simple mouth line matching the expression. A short single neck line always connects the head to the shoulders, leaving a small clear gap between them (the head must never sit merged flush onto the shoulders), and nothing is ever wrapped around the neck (no headphones, scarf, necklace, or collar of any kind). The torso is a single closed outline shape (a plain t-shirt silhouette is fine — the only part allowed to be a filled 2D shape). Each arm and each leg is drawn as one single bare line stroke ending in a small round dot for the hand or foot — never a sleeve, never pants/trousers/shorts/jeans/leggings/skirt/shoes, no double-line limbs, no double-contour joints anywhere; legs are completely bare single lines with zero clothing, drawn the exact same simple way as the arms. Clean smooth unbroken lines, flat 2D line art, no shading, no fill except the torso shirt shape, no photorealism. IMPORTANT: absolutely no text, letters, numbers, labels, captions, arrows, or annotations of any kind should appear anywhere in the image — never technical/construction labels, never character names, never diagram-style callouts — UNLESS the scene itself naturally calls for one short, meaningful piece of in-scene text (for example a single word on a sign or book cover) that reinforces what the image is about, in which case keep it minimal and purposeful.',
    background: 'Plain white/cream background, no scenery, no props other than the character\'s own distinguishing accessory',
    colorPalette: ['#000000', '#FFFFFF', '#FE2C55 (single small accent only)'],
    renderNote: 'Character reference sheet, full body, front view, standing fully upright and centered in frame with even margin on all sides (not touching or cropped by the frame edge), neutral standing pose unless a specific pose is given, arms AND legs both drawn identically as single-line bare strokes ending in a small round dot (no pants, no trousers, no shorts, no double-contour limbs, no shoes with their own outline, no double-line joints), bare neck with no wrap-around accessory, consistent proportions for reuse as a recurring animated character across every episode'
  },

  realistic: {
    key: 'realistic',
    label: 'Ảnh Thật (Photorealistic)',
    icon: '📷',
    description: 'Ảnh chân dung/toàn thân chân thực như chụp máy ảnh chuyên nghiệp, ánh sáng studio tự nhiên.',
    visualStyle: 'Photorealistic cinematic portrait photography, natural human proportions, realistic skin texture and fabric detail, shot on a professional camera with a shallow depth of field',
    background: 'Softly blurred neutral studio background (light gray gradient), subtle professional studio lighting, no distracting scenery',
    colorPalette: ['Natural realistic skin tones', 'Neutral soft-gray studio background', 'Accent color taken only from the character\'s described outfit/prop'],
    renderNote: 'Character reference photo, full body or 3/4 body, front view, natural relaxed pose unless a specific pose is given, consistent facial features and outfit for reuse as a recurring character across every episode, ultra-detailed, high resolution'
  },

  anime: {
    key: 'anime',
    label: 'Anime',
    icon: '🎌',
    description: 'Phong cách hoạt hình Nhật Bản hiện đại, nét vẽ sạch, mắt to biểu cảm, tô màu cel-shading.',
    visualStyle: 'Modern Japanese anime/manga illustration style, clean cel-shaded coloring, expressive large eyes, crisp linework, vibrant but tasteful color palette',
    background: 'Simple flat solid-color background with a soft gradient, no busy scenery, subtle rim lighting around the character',
    colorPalette: ['Vibrant anime-style palette matching the character\'s described outfit/prop', 'Soft flat gradient background'],
    renderNote: 'Anime character reference sheet, full body, front view, dynamic yet clear pose unless a specific pose is given, consistent design (hair, outfit, proportions) for reuse as a recurring character across every episode'
  },

  render_3d: {
    key: 'render_3d',
    label: '3D',
    icon: '🧊',
    description: 'Nhân vật 3D dựng hình mềm mại kiểu phim hoạt hình Pixar/Disney, ánh sáng studio dịu nhẹ.',
    visualStyle: 'Modern 3D-rendered animated character style (Pixar/Disney-like), smooth stylized proportions, soft global illumination, subtle subsurface scattering on skin, clean toy-like textures',
    background: 'Simple softly-lit studio background with a gentle gradient and a soft shadow beneath the character, no scenery clutter',
    colorPalette: ['Warm soft 3D studio lighting palette', 'Colors matching the character\'s described outfit/prop'],
    renderNote: '3D character reference render, full body, front view, friendly neutral pose unless a specific pose is given, consistent model proportions and textures for reuse as a recurring character across every episode, smooth soft studio lighting'
  },

  comic_book: {
    key: 'comic_book',
    label: 'Truyện Tranh (Comic)',
    icon: '🦸',
    description: 'Phong cách vẽ comic kiểu Mỹ cổ điển, đường nét mạnh mẽ, đổ bóng chấm bán tông (halftone).',
    visualStyle: 'Retro American comic book illustration style, bold black ink outlines, dramatic ink shading, vintage halftone dot texture, dynamic pop art aesthetic',
    background: 'Stylized action backdrop with speed lines or solid retro color wash, minimal distraction',
    colorPalette: ['Vibrant classic comic book colors', 'High contrast primary colors'],
    renderNote: 'Comic character reference panel, full body, front view, bold outlines, consistent costume and hair details for recurring comic strip usage'
  },

  cyberpunk: {
    key: 'cyberpunk',
    label: 'Cyberpunk',
    icon: '🌆',
    description: 'Phong cách khoa học viễn tưởng tương lai, ánh sáng neon rực rỡ phản chiếu trên nền tối.',
    visualStyle: 'Futuristic cyberpunk concept art, high-tech and low-life aesthetic, dramatic volumetric neon lighting (cyan and magenta highlights), dark metallic surfaces, realistic textures',
    background: 'Dark wet city street, out-of-focus neon signs, cyberpunk alleyway atmosphere',
    colorPalette: ['Deep charcoal and black', 'Electric cyan', 'Fluorescent pink/magenta', 'Vibrant neon reflections'],
    renderNote: 'Cyberpunk character reference sheet, full body, detailed cybernetic modifications and high-tech gear visible, consistent facial features and glowing elements'
  },

  watercolor: {
    key: 'watercolor',
    label: 'Tranh Thủy Mặc (Watercolor)',
    icon: '🎨',
    description: 'Nét vẽ màu nước nghệ thuật, các mảng màu loang nhẹ nhàng kết hợp nét bút chì thanh mảnh.',
    visualStyle: 'Artistic watercolor painting style, soft pigment blooms, wet-on-wet paint textures, delicate pencil sketch outlines, clean handmade artistic look',
    background: 'Plain textured watercolor paper background, soft paint splashes around the edges, minimal detailing',
    colorPalette: ['Soft pastel color palette', 'Gentle washes of color', 'Natural earthy tones'],
    renderNote: 'Watercolor character reference painting, full body, elegant standing pose, artistic expression, consistent costume style'
  },

  pixel_art: {
    key: 'pixel_art',
    label: 'Pixel Art',
    icon: '👾',
    description: 'Phong cách trò chơi điện tử retro 16-bit, tạo hình khối pixel vuông sắc nét.',
    visualStyle: 'Retro 16-bit video game pixel art style, clean pixel grids, pixel art style, crisp blocky outlines, dithering textures, nostalgia gaming aesthetic',
    background: 'Simple flat pixelated background or solid color, retro game overlay style',
    colorPalette: ['Limited retro game color palette', 'High saturation colors'],
    renderNote: 'Pixel art character sprite sheet, full body, front view, clean resolution, consistent pixel proportions for character reuse'
  },

  claymation: {
    key: 'claymation',
    label: 'Đất Sét (Claymation)',
    icon: '🧸',
    description: 'Nhân vật nặn bằng đất sét thủ công kiểu Stop-Motion, vân tay và bề mặt chân thật.',
    visualStyle: 'Handmade stop-motion claymation style, realistic plasticine/clay material texture, visible soft fingerprint indentations, cute chunky proportions',
    background: 'Miniature clay model studio backdrop, soft craft lighting, shallow depth of field',
    colorPalette: ['Playful toy clay color palette', 'Matte solid clay finishes'],
    renderNote: 'Claymation character figure model sheet, full body, standing pose, look of a handmade stop-motion puppet, consistent textures for animation reference'
  },

  oil_painting: {
    key: 'oil_painting',
    label: 'Tranh Sơn Dầu (Oil)',
    icon: '🖌️',
    description: 'Phong cách tranh vẽ sơn dầu cổ điển, nét cọ dày thô rực rỡ, bề mặt vải canvas có chiều sâu.',
    visualStyle: 'Classical oil painting style, visible thick impasto brushstrokes, rich oil paint textures, master study fine art aesthetic, soft dramatic light-and-shadow (chiaroscuro)',
    background: 'Textured dark canvas background with soft blended brushstrokes, fine art museum feel',
    colorPalette: ['Rich deep oil pigments', 'Warm amber under-glow', 'Classic paint color tones'],
    renderNote: 'Oil painting portrait reference, full body or 3/4 view, classical pose, detailed fabric drapery, consistent facial details and painterly textures'
  }
};
