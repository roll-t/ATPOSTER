import { PROMPT_CATEGORIES } from './categories.js';
import { getStickFigureCastOverrides } from './castOverrides.js';

const CATEGORY_ENGLISH_LABELS = {
  english_quiz: 'English Quiz Video',
  stick_figure: 'Stick Figure Video',
  moral_wisdom: 'Moral Wisdom Video',
  english_tips: 'English Tips Video',
  character_ref: 'Character Reference Image'
};

function splitLines(text) {
  return (text || '').split('\n').map(l => l.trim()).filter(Boolean);
}

/**
 * Ghép style cố định của 1 chủ đề với nội dung người dùng vừa nhập, tạo ra prompt Veo3
 * hoàn chỉnh: bản JSON có cấu trúc + bản văn xuôi sẵn sàng dán vào Gemini/Veo3.
 */
export function buildPrompt(categoryKey, style, input) {
  const category = PROMPT_CATEGORIES[categoryKey];
  if (!category) {
    throw new Error('Chủ đề không hợp lệ.');
  }
  if (categoryKey === 'english_tips') {
    throw new Error('Định dạng "Video Mẹo Học Tiếng Anh" chỉ hỗ trợ tạo qua Gemini AI phân đoạn. Vui lòng bật "Tự động tạo kịch bản & phân đoạn bằng Gemini AI" ở trên.');
  }

  let scene, audioLines, captionNote;
  let charactersOverride = null;
  let voiceOverride = null;

  if (categoryKey === 'english_quiz') {
    const options = splitLines(input.options);
    scene = {
      setting: 'Abstract quiz-show set, solid gradient background, no real-world location',
      action_sequence: [
        `Reveal the question on screen: "${input.question}"`,
        `Reveal the ${options.length || 4} answer options one by one: ${options.join(' | ')}`,
        'Play a 3-2-1 countdown ring animation while the mascot looks thoughtful',
        `Highlight the correct answer "${input.correctAnswer}" in green with a checkmark; mark the others with a red X`,
        'Mascot celebrates with a simple happy animation',
        `Show the explanation text: "${input.explanation}"`
      ]
    };
    audioLines = [
      `Narrator reads the question aloud: "${input.question}"`,
      `Narrator reads the explanation: "${input.explanation}"`
    ];
    captionNote = 'Veo3 text rendering is not reliable for small readable UI text — treat the question/options/explanation above as the ON-SCREEN TEXT SPEC to recreate precisely in post-production (motion graphics/CapCut), not something to leave to the model to render freely.';
  } else if (categoryKey === 'stick_figure') {
    const { selectedCharacters, charactersOverride: castOverride, voiceOverride: voiceOv } = getStickFigureCastOverrides(input);
    charactersOverride = castOverride;
    voiceOverride = voiceOv;

    // Tự động thay A:/B:/C: trong kịch bản bằng đúng tên nhân vật đã chọn (theo thứ tự chọn)
    // để người dùng không phải gõ lại tên nhân vật thủ công mỗi lần viết kịch bản.
    let scriptText = input.script || '';
    const letters = ['A', 'B', 'C'];
    selectedCharacters.forEach((c, idx) => {
      if (idx < letters.length) {
        const re = new RegExp(`^${letters[idx]}\\s*:`, 'gm');
        scriptText = scriptText.replace(re, `${c.name}:`);
      }
    });
    const scriptLines = splitLines(scriptText);

    scene = {
      setting: input.scenario || 'A simple everyday setting',
      action_sequence: scriptLines.length
        ? scriptLines.map(l => `Stick figure line: ${l}`)
        : ['The selected stick figures act out the everyday scenario described.']
    };
    audioLines = scriptLines.length ? scriptLines : ['(Enter script dialogue above to populate this)'];

    const continuity = input.continuityNote ? ` Series continuity: ${input.continuityNote}.` : '';
    captionNote = `No subtitle bar anywhere on screen — only a small English speech bubble above the speaking character's head, showing a short caption (a few words, not the full line). The bubble appears instantly with a hard cut (no fade-in/slide animation), stays static, then cuts directly to the next caption the same way.${input.keyPhrase ? ` If possible, use the key phrase "${input.keyPhrase}" as that short caption.` : ''} Recurring cast for series continuity: ${charactersOverride || style.characters}.${continuity}`;
  } else if (categoryKey === 'moral_wisdom') {
    scene = {
      setting: input.story || 'A relatable everyday situation',
      action_sequence: [
        `Open on the everyday moment: ${input.story}`,
        'Narration builds toward the lesson in simple English',
        `Close on the message: "${input.quote}"`
      ]
    };
    audioLines = [
      `Narrator tells the story in simple English, based on: ${input.story}`,
      `Closing line, spoken slowly for emphasis: "${input.quote}"`
    ];
    captionNote = `Persistent bilingual subtitle bar (EN/VI) throughout the narration; the closing quote "${input.quote}" also appears as a large on-screen text overlay in the final 3 seconds.`;
  }

  const jsonPrompt = {
    title: input.topic || input.scenario || input.theme || CATEGORY_ENGLISH_LABELS[categoryKey] || category.label,
    series: style.series,
    category: CATEGORY_ENGLISH_LABELS[categoryKey] || category.label,

    aspect_ratio: style.aspectRatio,
    duration_seconds: style.durationSeconds,
    style: {
      visual_style: style.visualStyle,
      color_palette: style.colorPalette,
      lighting: style.lighting,
      camera: style.camera,
      mood_tone: style.moodTone,
      typography_note: style.typographyNote
    },
    scene: {
      ...scene,
      characters: charactersOverride || style.characters
    },
    audio: {
      voice: voiceOverride || style.voice,
      narration_language: 'Simple/basic English (CEFR A2-B1 vocabulary, short sentences)',
      dialogue_lines: audioLines,
      music: style.music,
      sfx: style.sfx
    },
    on_screen_captions: {
      note: captionNote
    },
    brand_consistency_notes: `Always reuse this EXACT color palette, character design, camera style, and pacing for every video in the "${style.series}" series so viewers instantly recognize the channel across all uploads.`
  };

  const paletteList = Array.isArray(style.colorPalette) ? style.colorPalette.join(', ') : String(style.colorPalette || '');

  const textPrompt = [
    `${style.visualStyle}. ${style.moodTone}.`,
    `Setting: ${scene.setting}.`,
    `Characters: ${charactersOverride || style.characters}.`,
    `Camera: ${style.camera}. Lighting: ${style.lighting}.`,
    `Action: ${scene.action_sequence.join(' Then, ')}.`,
    `Voice/narration: ${voiceOverride || style.voice}, speaking simple basic English. Lines: ${audioLines.join(' / ')}.`,
    `Music: ${style.music}. Sound effects: ${style.sfx}.`,
    `On-screen text: ${style.typographyNote}.`,
    `Format: vertical ${style.aspectRatio}, about ${style.durationSeconds} seconds.`,
    `Consistency: match the exact visual style, color palette (${paletteList}), and pacing used across the entire "${style.series}" series.`
  ].join(' ');

  return { jsonPrompt, textPrompt, captionNote };
}
