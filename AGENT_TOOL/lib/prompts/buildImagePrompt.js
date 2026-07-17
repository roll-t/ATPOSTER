import { PROMPT_CATEGORIES } from './categories.js';
import { STICK_FIGURE_CHARACTERS } from './characters.js';
import { IMAGE_STYLES } from './imageStyles.js';
import { LAYOUT_TYPES } from './layouts.js';

/**
 * Ghép style cố định của 1 chủ đề ẢNH (chỉ còn aspectRatio) + phong cách ảnh người dùng
 * chọn (IMAGE_STYLES: người que / ảnh thật / anime / 3D...) với nội dung người dùng vừa
 * nhập, tạo ra prompt tạo ảnh hoàn chỉnh (bản JSON có cấu trúc + bản văn xuôi) — dùng cho
 * Canva/Midjourney/Nano Banana... Khác với buildPrompt.js (video: có scene/audio/duration),
 * ở đây chỉ có 1 khung hình tĩnh nên không có action_sequence hay audio.
 */
export function buildImagePrompt(categoryKey, style, input) {
  const category = PROMPT_CATEGORIES[categoryKey];
  if (!category) {
    throw new Error('Chủ đề không hợp lệ.');
  }

  const imageStyle = IMAGE_STYLES[input.imageStyle];
  if (!imageStyle) {
    throw new Error('Vui lòng chọn 1 phong cách ảnh.');
  }

  const layout = LAYOUT_TYPES[input.shotType || 'front_facing'];
  if (!layout) {
    throw new Error('Vui lòng chọn 1 bố cục / góc chụp.');
  }

  const CATEGORY_ENGLISH_LABELS = {
    english_quiz: 'English Quiz Video',
    stick_figure: 'Stick Figure Video',
    moral_wisdom: 'Moral Wisdom Video',
    english_tips: 'English Tips Video',
    character_ref: 'Character Reference Image'
  };

  const IMAGE_STYLE_ENGLISH_LABELS = {
    stick_figure: 'Stick Figure (Whiteboard)',
    realistic: 'Photorealistic',
    anime: 'Anime',
    render_3d: '3D Render',
    comic_book: 'Comic Book',
    cyberpunk: 'Cyberpunk',
    watercolor: 'Watercolor',
    pixel_art: 'Pixel Art',
    claymation: 'Claymation',
    oil_painting: 'Oil Painting'
  };

  let title, subjectDescription;

  if (categoryKey === 'character_ref') {
    const characterDesc = input.characterDescription || '';

    // Dịch các lựa chọn thuộc tính cơ bản sang Tiếng Anh
    const ageMap = {
      adult: 'a young adult',
      child: 'a child',
      teenager: 'a teenager',
      elderly: 'an elderly person'
    };
    const ageStr = input.exactAge ? `${input.exactAge} years old` : (ageMap[input.ageGroup] || 'a young adult');
    
    const heightMap = {
      medium: 'medium height',
      short: 'short stature',
      tall: 'tall'
    };
    const heightStr = heightMap[input.height] || 'medium height';
    
    let hairStr = '';
    if (input.hairLength === 'bald') {
      hairStr = 'bald head';
    } else {
      const lenMap = {
        short_hair: 'short',
        long_hair: 'long',
        medium_hair: 'medium-length'
      };
      const len = lenMap[input.hairLength] || 'short';
      if (input.imageStyle === 'stick_figure') {
        hairStr = `hollow outline ${len} hair, simple black line art, no solid black coloring`;
      } else {
        const colMap = {
          black: 'black',
          brown: 'brown',
          blonde: 'blonde',
          grey: 'grey',
          red: 'red'
        };
        const col = colMap[input.hairColor] || 'black';
        hairStr = `${len} ${col} hair`;
      }
    }

    const personalityMap = {
      friendly: 'friendly and approachable vibe',
      energetic: 'energetic and dynamic vibe',
      gentle: 'gentle and calm vibe',
      confident: 'confident and self-assured vibe',
      cool: 'cool and confident posture',
      serious: 'serious and focused look',
      shy: 'shy and introverted look'
    };
    const personalityStr = personalityMap[input.personality] || 'friendly and approachable vibe';

    const baseFeatures = `${ageStr}, ${heightStr}, with ${hairStr}, embodying a ${personalityStr}`;

    // Trích xuất 3 từ đầu tiên để làm tiêu đề ngắn
    let shortName = 'Character';
    if (characterDesc.trim()) {
      const match = characterDesc.trim().match(/^([A-Za-z0-9\s,]+)/);
      shortName = match ? match[1].split(' ').slice(0, 3).join(' ') : 'Character';
    } else {
      // Viết hoa chữ cái đầu của độ tuổi
      shortName = ageStr.charAt(0).toUpperCase() + ageStr.slice(1);
    }

    const englishImageStyleLabel = IMAGE_STYLE_ENGLISH_LABELS[input.imageStyle] || imageStyle.label;
    title = `${shortName} — Character Reference (${englishImageStyleLabel})`;
    subjectDescription = [
      baseFeatures,
      characterDesc.trim() ? characterDesc.trim() : '',
      input.pose ? `Pose: ${input.pose}.` : '',
      input.expression ? `Facial expression: ${input.expression}.` : '',
      layout.promptSuffix ? `${layout.promptSuffix}.` : ''
    ].filter(Boolean).join('. ');
  } else {
    throw new Error('Chủ đề ảnh này chưa được hỗ trợ.');
  }

  const selectedAspectRatio = input.aspectRatio || style.aspectRatio || '3:4';
  const paletteList = Array.isArray(imageStyle.colorPalette) ? imageStyle.colorPalette.join(', ') : String(imageStyle.colorPalette || '');

  const jsonPrompt = {
    title,
    category: CATEGORY_ENGLISH_LABELS[categoryKey] || category.label,
    image_style: IMAGE_STYLE_ENGLISH_LABELS[input.imageStyle] || imageStyle.label,
    layout: layout.label,
    aspect_ratio: selectedAspectRatio,
    style: {
      visual_style: imageStyle.visualStyle,
      background: imageStyle.background,
      color_palette: imageStyle.colorPalette,
      render_note: imageStyle.renderNote
    },
    subject: subjectDescription
  };

  const textPrompt = [
    `${imageStyle.visualStyle}.`,
    `Subject: ${subjectDescription}`,
    `Background: ${imageStyle.background}.`,
    `Color palette: ${paletteList}.`,
    `${imageStyle.renderNote}.`,
    `Format: ${selectedAspectRatio} image.`
  ].join(' ');

  return { jsonPrompt, textPrompt };
}

