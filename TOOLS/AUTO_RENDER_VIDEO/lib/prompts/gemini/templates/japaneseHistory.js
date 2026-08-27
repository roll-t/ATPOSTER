import { getJapaneseHistoryTheme } from '../../japaneseHistoryThemes.js';
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
 * Prompt cho Gemini viết kịch bản skill "Lịch Sử Nhật Bản, Samurai & Ninja" — 100% TIẾNG NHẬT.
 *
 * Dựng trên đúng bộ luật của skill Phật giáo (xem japaneseNarrativeShared.js): nhịp 5 giây một ảnh,
 * đếm độ dài bằng ký tự, tag ElevenLabs v3, phụ đề Nhật-Việt, luật viết visualDescription kèm bảng
 * đổi đồ vật sang Nhật, luật cấm giọng ru ngủ / self-help, khối đăng video, hai prompt ảnh bìa.
 *
 * PHONG CÁCH ẢNH GIỮ NGUYÊN của skill Phật giáo (tranh mực + màu nước trên giấy trắng, xem
 * JAPANESE_INK_STYLE_CLAUSE trong buildSegmentedPrompts.js). Chỉ đổi BỐI CẢNH và NHÂN VẬT.
 *
 * KHÁC BIỆT LỚN NHẤT so với skill Phật giáo: đây là đề tài LỊCH SỬ, nên có thêm một ràng buộc mà
 * skill kia không cần — không được bịa sử. Xem SUBJECT_REQUIREMENT bên dưới.
 */

export { DURATION_TARGETS };
export const getHistoryCharTarget = getCharTarget;
export const getHistoryCharsPerSlide = getCharsPerSlide;
export const getHistorySlideTarget = getSlideTarget;
export const getHistoryDurationOptions = getDurationOptions;

const VOCABULARY_NOTE = `- Keep the vocabulary plain. Historical terms a general Japanese listener knows (武士, 大名, 幕府, 戦国, 忍び) are fine unglossed. Anything narrower than that — an obscure office, a rare weapon name — gets one short plain-Japanese gloss the first time, then use it freely.`;

const CHANNEL_IDENTITY = `WHAT THIS CHANNEL IS, AND WHAT IT IS NOT:
- It is a JAPANESE HISTORY channel. The episode exists to carry one real episode of history, or the real working life of a real class of people. That is the content, not the decoration.
- It is NOT a sleep channel, NOT a relaxation channel, NOT a "wind down before bed" channel. The video is watched at any hour. Never assume the listener is in bed, never send them to sleep, never wish them good night.
- It is NOT a self-help channel. You are not drawing life lessons for the listener out of history. Tell what happened and what it cost the people it happened to. If a meaning is there, the listener will find it without you pointing.
- It is NOT an action channel. No choreographed duels, no body counts, no dramatic narration of violence. The interesting part is always the decision, the waiting, or the consequence.`;

const SUBJECT_REQUIREMENT = `REQUIRED: THIS IS HISTORY. DO NOT INVENT IT.
- Separate RECORD from LEGEND, out loud, whenever both exist. 「記録に残っているのはここまでです。」 then the legend, marked as legend. Never present a story as documented fact when it is not.
- Do not invent dates, names, casualty numbers, quotations, or documents. If you are not certain, either leave the detail out or say plainly that it is not known.
- Reconstructed scene detail is allowed and wanted — what the road felt like underfoot, how cold the armour was, how long the wait lasted. That is texture, not fabrication. Inventing a named person's words is fabrication.
- Name the era once, plainly, so the listener knows where they are standing: 平安, 鎌倉, 戦国, 江戸, 幕末, 明治.
- Popular-culture ninja and samurai are NOT the subject. No fireballs, no flying, no invincible swordsmen. The real craft is far more interesting and is what this channel is for.`;

const HONEST_FILL = `  - what the same day looked like from the other side;
  - what the people involved did afterwards, and what it cost them;
  - the ordinary machinery around the event — who fed the army, who carried the message, who paid for it;
  - what the record does NOT say, and why that gap exists.`;

const WORLD_LIST = `WHAT MAY APPEAR (the world of this episode is old Japan):
- Samurai in dark lacquered armour with wide shoulder plates, or in plain everyday kimono with two swords at the waist; foot soldiers in simple helmets; lords in stiff wide-shouldered formal dress; couriers and travellers in straw hats; shinobi dressed as ordinary farmers, pedlars or monks; village women in plain wrapped kimono.
- Castle keeps above stone walls and moats, castle gates and guard towers, post roads and mountain passes, terraced rice fields, harbours of wooden ships, training halls with worn floorboards, market streets of wooden shopfronts under deep eaves.
- Mountain paths, rivers and stone crossings, pine and bamboo forests, meadows and dry grass, rain, mist, snow, wide pale skies.
- Small objects: long and short swords on wooden stands, helmets with wide neck-guards, banners with family crests, lacquered message boxes, rolled maps and letters, straw sandals, wooden buckets, ink stones and bamboo brushes, clay tea bowls.`;

const PUBLISHING = `────────────────────────────────────────
7. PUBLISHING BLOCK — JAPANESE TITLE AND HASHTAGS
────────────────────────────────────────
This is what gets pasted into YouTube when the video is uploaded, so it is written for a JAPANESE viewer scrolling a feed, not for a search engine.
- "youtubeTitle": one line of Japanese, 20 to 40 characters. Name the person, the place or the moment concretely — Japanese history viewers search and click on specific names, not on abstractions.
  - Never clickbait, never all-caps, never 【衝撃】【必見】-style brackets, never emoji, never a promise the episode does not keep. Never 「教科書が教えない真実」-style conspiracy framing.
  - A quiet marker of the format is welcome when it fits naturally: 【日本史】, 【戦国】, 【侍】, 【忍び】.
  - Never a sleep or relaxation marker: no 「眠れない夜に」, no 「作業用」, no 「睡眠導入」. This is not that channel.
- "hashtags": 5 to 8 Japanese hashtags as an array of strings, each starting with "#", no spaces inside a tag.
  - Mix three kinds: the field (#日本史, #歴史), the era or class this episode sits in (#戦国時代, #江戸時代, #侍, #忍者), and the specific person, place or event it covers (#織田信長, #関ヶ原, #伊賀).
  - Written the way Japanese viewers actually search, not translated from English.
  - NEVER sleep or background-noise tags: no #睡眠導入, no #作業用BGM, no #安眠, no #リラックス. Those pull the channel into a category it is not in, and YouTube will recommend it next to sleep videos instead of history ones.
- "youtubeDescription": 2 to 4 sentences of Japanese introducing the episode in the same calm voice as the narration, then a blank line, then the hashtags on one line.`;

export function buildJapaneseHistoryScriptPrompt(input, durationInfo, durationRange = '8_10m') {
  const isLandscape = (input.aspectRatio || '16:9') === '16:9';
  const themeObj = getJapaneseHistoryTheme(input.historyTheme || 'japan_history');
  const { slides: targetSlides, chars: targetChars } = targetFor(durationRange);

  const themeBlock = `IMAGES FOR THIS THEME — 「${themeObj.label}」 (${themeObj.en}):
- Across the episode the pictures must keep returning to this theme instead of drifting into generic old-Japan scenery. When the narration allows it, draw from: ${themeObj.motifs}.
- Always stay on whatever the narration is actually pointing at in THIS segment. The list above is a menu for when the words turn to explanation and give you no action to show, never a reason to replace the moment being told.
- RECURRING ANCHOR: choose ONE object or place from that list in the first few segments and bring it back two or three more times later in the episode, so the slides read as one episode rather than a pile of unrelated postcards.`;

  return `
You are the writer of a Japanese history channel — someone who tells one real episode of Japanese history per video, calmly and without hurry. The channel publishes to a JAPANESE audience on YouTube. Your job is to write the spoken script for one episode in Japanese, plus one painted illustration prompt for every slide, plus the Japanese title and hashtags used to publish it, plus two cover-art prompts.

${CHANNEL_IDENTITY}

THEME GROUP: 「${themeObj.label}」 — ${themeObj.en}
THIS IS THE SUBJECT THE EPISODE MUST CARRY. Not a mood, not a lifestyle tip: a real piece of history with real people in it.
HOW THIS THEME WANTS TO BE TOLD: ${themeObj.story}
EPISODE TOPIC REQUESTED BY THE USER:
"${input.scenario || 'A single decisive day in the Sengoku period'}"
${input.script ? `EXTRA CONTEXT / DRAFT FROM THE USER: "${input.script}"` : ''}

${sectionLanguage(VOCABULARY_NOTE)}

${sectionVoice(
    '「峠の茶屋の前に、荷を下ろした男が一人立っていました。」 then, later, ease into the account.',
    '- Wrong: 「今日は関ヶ原の戦いについて解説します。」 / 「歴史を変えた、運命の一日が始まろうとしていた。」',
  )}

${sectionBanned(SUBJECT_REQUIREMENT)}

${SECTION_TAGS}

${sectionLength(durationInfo, targetSlides, targetChars, HONEST_FILL)}

${SECTION_SUBTITLES}
Example:
  "subtitle": "刀を置いたのは、負けたからではありません。**役目が終わったからです。**\\nÔng đặt kiếm xuống không phải vì thua. **Mà vì phận sự đã xong.**"

${sectionVisual({
    worldOpeners: '"Inside the keep of a Japanese castle," / "On a post road through a mountain pass in old Japan," / "In the dirt courtyard of a samurai residence,"',
    peopleExamples: '"A samurai in dark lacquered armour with wide shoulder plates, hair tied in a topknot." "A foot soldier in a plain conical helmet and quilted coat." "A village woman in a faded indigo kimono and straw sandals."',
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
  "title": "日本語のエピソードタイトル（素朴で具体的なもの）",
  "youtubeTitle": "【戦国】刀を置いた日｜ある侍の最後の役目",
  "hashtags": ["#日本史", "#歴史", "#戦国時代", "#侍", "#武士道", "#城"],
  "youtubeDescription": "ある侍が刀を置いた一日の話を、記録に残っている範囲でひとつ。ゆっくりお話しします。\\n\\n#日本史 #歴史 #戦国時代 #侍 #武士道 #城",
  "theme": "${themeObj.key}",
  "coverPrompts": {
    "landscape": "On the stone forecourt of a Japanese castle in old Japan. On the right, a samurai in dark lacquered armour kneels with both hands resting on his knees, his long sword laid on a low wooden stand before him. On the left, wide open gravel running toward a tall stone wall and a castle keep beyond it. Bright overcast morning, soft even light.",
    "portrait": "Close-up on a plank floor inside a Japanese castle room. A single long sword resting on a dark wooden stand, its lacquered scabbard catching the flat daylight. Behind it, out of focus, a paper screen and one timber post. Early morning, soft grey light above and worn wood below."
  },
  "totalSegments": 25,
  "segments": [
    {
      "segmentNumber": 1,
      "durationSeconds": ${SECONDS_PER_IMAGE},
      "visualDescription": "On a post road through a mountain pass in old Japan. A wide view of a packed-dirt road climbing between pines under a pale overcast sky. On the left, a weathered stone milestone at the roadside. Thin mist across the middle distance. A straw-roofed tea stall in the far distance. Tall grass in the foreground. Early morning, soft even light.",
      "dialogueOrNarration": "[thoughtful] 峠の道は、朝のうちはまだ湿っていました。",
      "subtitle": "峠の道は、**朝のうちはまだ**湿っていました。\\nCon đường đèo, **buổi sớm vẫn còn** ẩm ướt."
    },
    {
      "segmentNumber": 7,
      "durationSeconds": ${SECONDS_PER_IMAGE},
      "visualDescription": "In the dirt courtyard of a samurai residence in old Japan. Mid-shot of a samurai in dark lacquered armour kneeling on one knee, head lowered, both hands on his thigh. Facing him, a lord in stiff wide-shouldered formal dress stands on a raised wooden verandah under deep eaves. Behind them, a plastered wall and one pine. Bright overcast morning, soft even light.",
      "dialogueOrNarration": "その命令に、彼は一度も顔を上げませんでした。",
      "subtitle": "その命令に、**一度も顔を上げません**でした。\\nTrước lệnh đó, ông **không một lần ngẩng mặt lên**."
    }
  ]
}
`.trim();
}
