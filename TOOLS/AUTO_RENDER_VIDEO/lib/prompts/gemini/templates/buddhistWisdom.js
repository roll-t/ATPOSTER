import { getBuddhistTheme } from '../../buddhistThemes.js';
import {
  sectionLanguage,
  SECTION_TAGS,
  SECTION_SUBTITLES,
  SECTION_COVER,
  SECTION_JSON_RULES,
  SECONDS_PER_IMAGE,
  DURATION_TARGETS,
  sectionVoice,
  sectionBanned,
  sectionLength,
  sectionVisual,
  compositionGuidanceFor,
  targetFor,
  getCharTarget,
  getCharsPerSlide,
  getSlideTarget,
  getDurationOptions,
} from './japaneseNarrativeShared.js';

/**
 * Prompt cho Gemini viết kịch bản skill "Chuyện Triết Lý & Thiền Phật Giáo" — 100% TIẾNG NHẬT.
 *
 * Mọi luật DÙNG CHUNG với các skill kể chuyện tiếng Nhật khác (nhịp 5 giây/ảnh, đếm ký tự, tag
 * ElevenLabs, phụ đề Nhật-Việt, luật viết visualDescription, luật cấm giọng ru ngủ/self-help, ảnh
 * bìa) nằm ở japaneseNarrativeShared.js. File này chỉ còn phần RIÊNG của Phật giáo:
 * định vị kênh, yêu cầu neo vào giáo lý, thế giới hình ảnh, khối đăng video và ví dụ JSON.
 *
 * Xem thêm japaneseHistory.js — skill lịch sử Nhật dùng chung đúng bộ luật đó với bối cảnh khác.
 */

// Giữ nguyên tên export cũ: ContentForm, lib/skills/buddhist_wisdom.js và các test đang gọi chúng.
export { DURATION_TARGETS };
export const getBuddhistCharTarget = getCharTarget;
export const getBuddhistCharsPerSlide = getCharsPerSlide;
export const getBuddhistSlideTarget = getSlideTarget;
export const getBuddhistDurationOptions = getDurationOptions;

// Tu vung rieng cua skill nay — khac nhau giua Phat giao va Lich su.
const VOCABULARY_NOTE = `- Keep the vocabulary plain. Buddhist terms that a general Japanese listener knows (禅, 無常, 執着, 慈悲, 悟り) are fine. Do not stack rare sutra vocabulary or unglossed Sanskrit.`;

const CHANNEL_IDENTITY = `WHAT THIS CHANNEL IS, AND WHAT IT IS NOT:
- It is a BUDDHIST channel. The episode exists to carry a Buddhist story or a Buddhist teaching. That is the content, not the decoration.
- It is NOT a sleep channel, NOT a relaxation channel, NOT a "wind down before bed" channel. The video is watched at any hour. Never assume the listener is in bed, never send them to sleep, never wish them good night.
- It is NOT a self-help channel. You are not coaching anyone toward a better life. You are telling them something the Buddhist tradition says, and letting them sit with it.`;

const SUBJECT_REQUIREMENT = `REQUIRED: THE TEACHING MUST BE BUDDHIST, NOT GENERIC WELLNESS.
- Name the Buddhist idea the story carries, plainly and ONCE, somewhere in the episode:
  無常、縁起、執着、苦、中道、慈悲、空、因果、一期一会 — whichever one actually fits this story.
- 「心の荷物を下ろして楽になりましょう」 is pop psychology. 「執着を手放す」, arrived at through what
  the monk concretely did and named once, is the teaching. Write the second, never the first.
- Do not invent sutra quotations, and do not attribute anything to the Buddha you are not certain
  of. A well-known teaching stated plainly needs no citation.`;

// Cach lap cho trong TRUNG THUC khi truyen het ma con slide — rieng cua tung skill.
const HONEST_FILL = `  - where the story comes from, and who told it;
  - a second, related teaching that sharpens the first;
  - what the people in the story did with the rest of that day;
  - the same idea seen from the opposite side (what clinging costs, not just what letting go gives).`;

const WORLD_LIST = `WHAT MAY APPEAR (the world of this episode is old Japan):
- Japanese monks with shaved heads in plain ochre, saffron or grey robes; elderly teachers with long thin white beards; young disciples; villagers in wrapped kimono with cloth sashes; travellers in straw hats with walking staffs.
- Mountain paths, rivers and stone crossings, pine and bamboo forests, meadows and dry grass, rain, mist, snow, wide pale skies.
- Old wooden temples and small tatami rooms, worn stone steps, courtyards, raked gravel gardens, lotus ponds, ancient pines.
- Small objects: brass oil lamps, clay cups, open scrolls, ceramic inkwells, bamboo brushes, straw sandals, wooden bowls, walking staffs.`;

const PUBLISHING = `────────────────────────────────────────
7. PUBLISHING BLOCK — JAPANESE TITLE AND HASHTAGS
────────────────────────────────────────
This is what gets pasted into YouTube when the video is uploaded, so it is written for a JAPANESE viewer scrolling a feed, not for a search engine.
- "youtubeTitle": one line of Japanese, 20 to 40 characters. It must say what the listener will actually hear and give a reason to stop scrolling. Concrete beats abstract: a story, an image, or a question that has a real answer inside the episode.
  - Never clickbait, never all-caps, never 【衝撃】【必見】-style brackets, never emoji, never a promise the episode does not keep. This is a calm channel and the title has to sound like the voice inside.
  - A quiet marker of the format is welcome when it fits naturally: 【禅の物語】, 【仏教の教え】, 【禅語】.
  - Never a sleep or relaxation marker: no 「眠れない夜に」, no 「作業用」, no 「睡眠導入」. This is not that channel.
- "hashtags": 5 to 8 Japanese hashtags as an array of strings, each starting with "#", no spaces inside a tag.
  - Mix three kinds: the tradition (#仏教, #禅, #禅語), the kind of content (#法話, #仏教の教え, #禅の物語), and the specific idea this episode carries (#執着, #無常, #手放す).
  - Written the way Japanese viewers actually search, not translated from English.
  - NEVER sleep or background-noise tags: no #睡眠導入, no #作業用BGM, no #安眠, no #リラックス. Those pull the channel into a category it is not in, and YouTube will recommend it next to sleep videos instead of Buddhist ones.
- "youtubeDescription": 2 to 4 sentences of Japanese introducing the episode in the same calm voice as the narration, then a blank line, then the hashtags on one line.`;

export function buildBuddhistWisdomScriptPrompt(input, durationInfo, durationRange = '8_10m') {
  const isLandscape = (input.aspectRatio || '16:9') === '16:9';
  const themeObj = getBuddhistTheme(input.buddhistTheme || 'zen_stories');
  const { slidesEn: targetSlides, minChars: targetChars } = targetFor(durationRange);

  const themeBlock = `IMAGES FOR THIS THEME — 「${themeObj.label}」 (${themeObj.en}):
- Across the episode the pictures must keep returning to this theme instead of drifting into generic temple scenery. When the narration allows it, draw from: ${themeObj.motifs}.
- Always stay on whatever the narration is actually pointing at in THIS segment. The list above is a menu for when the words turn inward and give you no action to show, never a reason to replace the moment being told.
- RECURRING ANCHOR: choose ONE object or gesture from that list in the first few segments and bring it back two or three more times later in the episode, so the slides read as one episode rather than a pile of unrelated postcards.`;

  return `
You are the writer of a Japanese Buddhist storytelling channel — someone who tells one Buddhist story or teaching per episode, calmly and without hurry. The channel publishes to a JAPANESE audience on YouTube. Your job is to write the spoken script for one episode in Japanese, plus one painted illustration prompt for every slide, plus the Japanese title and hashtags used to publish it, plus two cover-art prompts.

${CHANNEL_IDENTITY}

THEME GROUP: 「${themeObj.label}」 — ${themeObj.en}
THIS IS THE BUDDHIST IDEA THE EPISODE MUST CARRY. Not a mood, not a lifestyle tip: a teaching with a name. Somewhere in the episode, name it in Japanese exactly once, then get back to the story.
HOW THIS THEME WANTS TO BE TOLD: ${themeObj.story}
EPISODE TOPIC REQUESTED BY THE USER:
"${input.scenario || 'The Art of Mindful Living and Letting Go'}"
${input.script ? `EXTRA CONTEXT / DRAFT FROM THE USER: "${input.script}"` : ''}

${sectionLanguage(VOCABULARY_NOTE)}

${sectionVoice(
    '「一時間ほど前から、また雨が降り始めました。」 then, later, ease into the story.',
    '- Wrong: 「今日は手放すことについて考えていきましょう。」 / 「ある二人の僧侶が、運命を変える選択を迫られました。」',
  )}

${sectionBanned(SUBJECT_REQUIREMENT)}

${SECTION_TAGS}

${sectionLength(durationInfo, targetSlides, targetChars, HONEST_FILL)}

${SECTION_SUBTITLES}
Example:
  "subtitle": "川のほとりで、私はもう彼女を下ろしました。**まだ背負っているのですか。**\\nTôi đã đặt cô ấy xuống bên sông rồi. **Còn anh thì vẫn đang cõng.**"

${sectionVisual({
    worldOpeners: '"Inside the study of an old Japanese temple," / "On a stone mountain path in old Japan," / "In the dirt courtyard of a small wooden temple,"',
    peopleExamples: '"An old monk with a shaved head in a faded ochre robe." "A young man in a grey wrapped kimono, hair tied in a topknot." "A village woman in a plain indigo kimono and straw sandals."',
    worldList: WORLD_LIST,
    themeBlock,
    compositionGuidance: compositionGuidanceFor(isLandscape),
  })}

${PUBLISHING}

${SECTION_COVER}

────────────────────────────────────────
9. OUTPUT FORMAT — STRICT JSON, NOTHING ELSE
────────────────────────────────────────
Return ONLY a valid JSON object in this exact shape. No markdown fences, no commentary before or after.

${SECTION_JSON_RULES}

{
  "title": "日本語のエピソードタイトル（素朴で人間的なもの）",
  "youtubeTitle": "【禅の物語】まだ背負っているのですか｜二人の僧と川",
  "hashtags": ["#仏教", "#禅", "#禅の物語", "#法話", "#執着", "#手放す"],
  "youtubeDescription": "川を渡る二人の僧の話から、執着とは何かを一つ。短い物語をひとつ、ゆっくりお話しします。\\n\\n#仏教 #禅 #禅の物語 #法話 #執着 #手放す",
  "theme": "${themeObj.key}",
  "coverPrompts": {
    "landscape": "On the muddy bank of a swollen river in old Japan. On the right, an older monk with a shaved head in a faded ochre robe crouches low with a young woman in a pale kimono stepping onto his back. On the left, wide open water running white over half-submerged stepping stones toward a far treeline. Bright overcast morning, soft even light.",
    "portrait": "Close-up in the courtyard of an old Japanese temple. A pair of open hands held palm up at chest height, a single wet maple leaf resting in one palm. Behind them, out of focus, the deep tiled eaves of a wooden temple and one pine. Early morning, soft grey mist above and worn stone below.",
    "headline": "川を渡る",
    "sub": "背負ったまま歩いた午後",
    "kicker": "ある夏の朝 山寺"
  },
  "totalSegments": 25,
  "segments": [
    {
      "segmentNumber": 1,
      "durationSeconds": ${SECONDS_PER_IMAGE},
      "visualDescription": "In the hills of old Japan. A wide view of an open meadow under a pale overcast sky. On the left, the deep tiled eaves of a small wooden temple among pines. Thin drizzle falling across the middle distance. A shallow stream winds through dry grass toward the far treeline. Tall grass in the foreground. Late afternoon, soft even light.",
      "dialogueOrNarration": "[thoughtful] 一時間ほど前から、また雨が降り始めました。",
      "subtitle": "一時間ほど前から、**また雨が**降り始めました。\\nChừng một tiếng trước, **mưa lại** bắt đầu rơi."
    },
    {
      "segmentNumber": 7,
      "durationSeconds": ${SECONDS_PER_IMAGE},
      "visualDescription": "On a country road in old Japan. Mid-shot at the muddy edge of a swollen river. An older monk with a shaved head, in a faded ochre robe, crouches low with his back turned to a young woman in a pale kimono, her hair pinned in a bun, one hand braced on his knee, head lowered. She is stepping toward him, gathering her hem. Behind them, water churning white over half-submerged stepping stones. Wet pines along the far bank. Bright overcast morning, soft even light.",
      "dialogueOrNarration": "若い僧は、戒律のことを言いかけました。",
      "subtitle": "若い僧は、**戒律のことを**言いかけました。\\nVị sư trẻ vừa định nói **về giới luật**."
    }
  ]
}
`.trim();
}
