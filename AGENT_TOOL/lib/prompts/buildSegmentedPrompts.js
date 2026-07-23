import { PROMPT_CATEGORIES } from './categories.js';
import { getStickFigureCastOverrides } from './castOverrides.js';
import { IMAGE_STYLES } from './imageStyles.js';

const CATEGORY_ENGLISH_LABELS = {
  english_quiz: 'English Quiz Video',
  stick_figure: 'Stick Figure Video',
  moral_wisdom: 'Moral Wisdom Video',
  english_tips: 'English Tips Video',
  character_ref: 'Character Reference Image',
  stick_figure_slideshow: 'Stick Figure Slideshow Image',
  reading_practice: 'Reading Practice Page Image',
  moral_talk_slideshow: 'Moral Talk Pictogram Slideshow Image'
};

/**
 * Ghép style cố định của chủ đề với từng phân đoạn được sinh ra từ Gemini
 * để tạo ra danh sách prompt (Veo3 hoặc Midjourney/Flux) hoàn chỉnh cho từng phân đoạn.
 */
export function buildSegmentedPrompts(categoryKey, style, title, segments, input = {}) {
  const category = PROMPT_CATEGORIES[categoryKey];
  if (!category) {
    throw new Error('Chủ đề không hợp lệ.');
  }

  // --- Nếu là Slide Ảnh Người Que ---
  if (categoryKey === 'stick_figure_slideshow') {
    const imageStyle = IMAGE_STYLES.stick_figure;
    const selectedAspectRatio = input.aspectRatio || '9:16';
    const paletteList = Array.isArray(imageStyle.colorPalette) ? imageStyle.colorPalette.join(', ') : String(imageStyle.colorPalette || '');

    const { selectedCharacters } = getStickFigureCastOverrides(input);
    const charactersDescription = selectedCharacters
      .map(c => `${c.name} (${c.en.personality}, distinguishing look: ${c.en.trait})`)
      .join(', and ');

    // LƯU Ý: KHÔNG dùng imageStyle.renderNote ở đây — renderNote đó được viết riêng cho ảnh
    // tham chiếu 1 nhân vật đứng thẳng nhìn thẳng (character_ref), nếu gắn vào từng slide cảnh
    // truyện thì AI ảnh sẽ hiểu nhầm thành yêu cầu vẽ "character reference sheet" có chú thích/
    // nhãn kỹ thuật (chính là nguyên nhân chữ "CHARACTER REFERENCE", "NECK GAP"... bị vẽ lên ảnh).
    const sceneRenderNote = 'This is a single static story-illustration frame (NOT a character reference sheet) — depict the scene naturally exactly as described, in whatever pose/angle/framing fits the action, with no labeled callouts, no arrows, no technical/construction annotations, and no character name text anywhere in the image.';

    return segments.map(seg => {
      const jsonPrompt = {
        title: `${title} - Slide ${seg.segmentNumber}`,
        category: 'Image Slideshow Video',
        image_style: imageStyle.label,
        aspect_ratio: selectedAspectRatio,
        style: {
          visual_style: imageStyle.visualStyle,
          background: imageStyle.background,
          color_palette: imageStyle.colorPalette,
          render_note: sceneRenderNote
        },
        scene: {
          setting: seg.visualDescription,
          characters: charactersDescription || 'None'
        },
        audio: {
          dialogue_lines: [seg.dialogueOrNarration]
        },
        on_screen_captions: {
          subtitle: seg.subtitle
        }
      };

      const textPrompt = [
        `${imageStyle.visualStyle}.`,
        `Scene description: ${seg.visualDescription}.`,
        charactersDescription ? `Featuring characters: ${charactersDescription}.` : '',
        imageStyle.background ? `Background setting: ${imageStyle.background}.` : '',
        paletteList ? `Color palette: ${paletteList}.` : '',
        `${sceneRenderNote}`,
        `Format: aspect ratio ${selectedAspectRatio}.`
      ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
        durationSeconds: 10,
        visualDescription: seg.visualDescription,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        jsonPrompt,
        textPrompt
      };
    });
  }

  // --- Nếu là Video Nói Chuyện Đạo Lý (pictogram trắng phát sáng trên nền đen) ---
  // Nhánh RIÊNG, tách biệt hoàn toàn khỏi stick_figure_slideshow ở trên — không dùng chung
  // IMAGE_STYLES.stick_figure (đó là nét vẽ tay đen trên nền trắng), và KHÔNG có khái niệm
  // nhân vật cố định xuyên suốt — mỗi slide là 1 nhóm pictogram tượng trưng riêng cho khoảnh
  // khắc đang kể (đúng tinh thần bộ icon "Human Pictogram" tham chiếu).
  if (categoryKey === 'moral_talk_slideshow') {
    const selectedAspectRatio = input.aspectRatio || '9:16';
    const visualStyle = 'Minimalist glowing white pictogram icon style on a solid pure black background. Simple flat white human-silhouette figures (no facial detail, no outline stroke, solid white fill) with a soft white outer glow/bloom, exactly like professional pictogram icon sets used in presentations. Include simple symbolic prop icons in the same white-glow style when needed (question marks, exclamation marks, speech bubbles, hearts, arrows, luggage, flags) to reinforce the moment being narrated. No text, no color, no shading detail, no background scenery — pure black background with only the glowing white silhouette figures and props, centered composition, generous negative space.';
    const background = 'Solid pure black background, no scenery, no props other than simple white-glow symbolic icons that directly support the moment.';
    const colorPalette = ['#000000 (background)', '#FFFFFF (glowing pictogram figures/icons)'];
    const paletteList = colorPalette.join(', ');
    const sceneRenderNote = 'This is a single static symbolic pictogram frame (NOT a character reference sheet, NOT a hand-drawn illustration) — depict only simple glowing white silhouette figures/icons on solid black, exactly like a professional pictogram icon set, with no labeled callouts, no arrows-as-annotations, no text of any kind anywhere in the image.';

    return segments.map(seg => {
      const jsonPrompt = {
        title: `${title} - Slide ${seg.segmentNumber}`,
        category: 'Moral Talk Pictogram Slideshow',
        image_style: 'Glowing White Pictogram (Black Background)',
        aspect_ratio: selectedAspectRatio,
        style: {
          visual_style: visualStyle,
          background,
          color_palette: colorPalette,
          render_note: sceneRenderNote
        },
        scene: {
          setting: seg.visualDescription
        },
        audio: {
          dialogue_lines: [seg.dialogueOrNarration]
        },
        on_screen_captions: {
          subtitle: seg.subtitle
        }
      };

      const textPrompt = [
        `${visualStyle}`,
        `Scene description: ${seg.visualDescription}.`,
        `Background setting: ${background}`,
        `Color palette: ${paletteList}.`,
        `${sceneRenderNote}`,
        `Format: aspect ratio ${selectedAspectRatio}.`
      ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
        durationSeconds: 10,
        visualDescription: seg.visualDescription,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        jsonPrompt,
        textPrompt
      };
    });
  }

  // --- Nếu là Trang Đọc Luyện Tiếng Anh (graded reader, có ảnh Hero minh hoạ phía trên và trang đọc phía dưới) ---
  if (categoryKey === 'reading_practice') {
    // Luôn sinh đúng 1 ảnh hero, tỉ lệ ngang (16:9) - bất kể tỉ lệ khung hình chung của cả video
    // (input.aspectRatio, thường là 9:16) - vì ảnh hero chỉ chiếm 1 dải/nền phía trên trang đọc,
    // không phải toàn khung hình. Trước đây có thử sinh thêm 1 bản dọc thứ 2 (secondaryVariant)
    // để chọn theo bố cục, nhưng chất lượng bản thứ 2 không ổn nên bỏ, quay lại 1 ảnh duy nhất.
    const selectedAspectRatio = '16:9';
    const level = (input.level || 'a2').toUpperCase();

    const heroVisualStyle = 'Vibrant 2D digital anime webtoon vector illustration style, clean line art, warm soft lighting, expressive characters, rich atmospheric details, aesthetic 2D artwork (NO text, NO labels, NO typography in image).';
    const heroRenderNote = 'This is a top-banner hero illustration for a reading practice story video. It must visually summarize and capture the entire theme, mood, and main characters of the story in a single rich composite scene. It sits in the upper hero area of the page. Keep composition centered and aesthetically balanced.';

    return segments.map(seg => {
      const jsonPrompt = {
        title: `${title} - Hero Illustration`,
        category: 'Reading Practice Hero Illustration',
        level,
        aspect_ratio: selectedAspectRatio,
        style: {
          visual_style: heroVisualStyle,
          render_note: heroRenderNote
        },
        scene: {
          setting: seg.visualDescription
        },
        audio: {
          narration: seg.dialogueOrNarration
        },
        on_screen_captions: {
          subtitle: seg.subtitle
        }
      };

      const textPrompt = [
        `${heroVisualStyle}`,
        `Hero illustration scene expressing the main story theme: ${seg.visualDescription}.`,
        `${heroRenderNote}`,
        `Format: aspect ratio ${selectedAspectRatio}.`
      ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
        durationSeconds: Math.max(8, Math.round((seg.dialogueOrNarration || '').trim().split(/\s+/).filter(Boolean).length / 2.5)),
        visualDescription: seg.visualDescription,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        aspectRatio: selectedAspectRatio,
        jsonPrompt,
        textPrompt
      };
    });
  }

  // --- Chế độ Video phân đoạn Veo3 cũ ---
  const paletteList = Array.isArray(style.colorPalette) ? style.colorPalette.join(', ') : String(style.colorPalette || '');

  let charactersDescription = style.characters;
  let voiceDescription = style.voice;
  if (categoryKey === 'stick_figure') {
    const { charactersOverride, voiceOverride } = getStickFigureCastOverrides(input);
    charactersDescription = charactersOverride || style.characters;
    voiceDescription = voiceOverride || style.voice;
  }

  let captionLabel = 'Bilingual subtitle';
  if (categoryKey === 'stick_figure') {
    captionLabel = "Speech bubble caption above the character's head (English only, no subtitle bar; appears instantly with a hard cut, no fade/slide animation, then cuts directly to the next line)";
  } else if (categoryKey === 'english_tips') {
    captionLabel = 'Bold on-screen keyword/bullet text on the whiteboard (English only, no subtitle bar; appears instantly with a hard cut, no fade/slide animation, then cuts directly to the next text)';
  }

  return segments.map(seg => {
    const safeDuration = Math.max(1, Math.min(10, Number(seg.durationSeconds) || 10));

    const jsonPrompt = {
      title: `${title} - Part ${seg.segmentNumber}`,
      series: style.series,
      category: CATEGORY_ENGLISH_LABELS[categoryKey] || category.label,
      aspect_ratio: style.aspectRatio,
      duration_seconds: safeDuration,

      style: {
        visual_style: style.visualStyle,
        color_palette: style.colorPalette,
        lighting: style.lighting,
        camera: style.camera,
        mood_tone: style.moodTone,
        typography_note: style.typographyNote
      },
      scene: {
        setting: seg.visualDescription,
        action_sequence: [seg.visualDescription],
        characters: charactersDescription
      },
      audio: {
        voice: voiceDescription,
        dialogue_lines: [seg.dialogueOrNarration],
        music: style.music,
        sfx: style.sfx
      },
      on_screen_captions: {
        note: `${captionLabel}: ${seg.subtitle}`
      },
      brand_consistency_notes: `Segment ${seg.segmentNumber} of a multi-part video in "${style.series}". Keep character models and scene backgrounds consistent.`
    };

    const textPrompt = [
      `${style.visualStyle}. ${style.moodTone}.`,
      `Scene detail: ${seg.visualDescription}.`,
      `Characters/Objects: ${charactersDescription}.`,
      `Camera: ${style.camera}. Lighting: ${style.lighting}.`,
      `Dialogue/Audio: ${seg.dialogueOrNarration}.`,
      `Voice: ${voiceDescription}.`,
      `Music: ${style.music}. Sound effects: ${style.sfx}.`,
      `${captionLabel}: ${seg.subtitle}.`,
      `Format: vertical ${style.aspectRatio}, duration: ${safeDuration} seconds.`,
      `Consistency: Part ${seg.segmentNumber} of "${style.series}" series. Keep visual features, color palette (${paletteList}), and pacing consistent.`
    ].join(' ');

    return {
      segmentNumber: seg.segmentNumber,
      durationSeconds: safeDuration,
      visualDescription: seg.visualDescription,
      dialogueOrNarration: seg.dialogueOrNarration,
      subtitle: seg.subtitle,
      jsonPrompt,
      textPrompt
    };
  });
}
