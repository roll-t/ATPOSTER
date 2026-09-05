import { getJapaneseHistoryTheme } from '../../japaneseHistoryThemes.js';
import { findJapaneseHistoryTopic } from '../../japaneseHistorySyllabus.js';
import {
  sectionLanguage,
  sectionTags,
  ELEVENLABS_V3_TAGS_HISTORY,
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
- It is NOT a shallow action channel. No choreographed fictional duels. BUT for tragic / disaster history episodes: DIRECTLY ADDRESS AND DETAIL the documented casualty numbers, the extreme suffering of the victims, and the harrowing human toll recorded in official chronicles without sanitizing history.`;

const SUBJECT_REQUIREMENT = `REQUIRED: THIS IS HISTORY. ACCURACY OUTRANKS EVERY OTHER INSTRUCTION IN THIS PROMPT.
This channel's whole value is that what it says is true. A beautiful episode with one invented fact in it is a failure. If following any other rule here would force you to state something you are not sure of, break that rule instead and say less.

THE THREE-WAY TEST — every factual sentence you write must fall into one of these, and you must know which:
  a) DOCUMENTED — contemporary sources support it. State it plainly, as fact.
  b) DISPUTED or UNCERTAIN — sources disagree, or the detail comes from a much later source. State it AS a hypothesis, with the doubt attached: 「〜という説があります。」「〜とも伝えられています。」「はっきりしたことは分かっていません。」
  c) UNKNOWN or INVENTED — you cannot support it at all. DELETE IT. Do not smooth it over, do not guess, do not fill the gap with something plausible.
Never let a (b) sentence be spoken in the voice of an (a) sentence. That single slip is how history channels lose their credibility.

WHAT YOU MAY NOT INVENT, EVER:
- Dates, place names, personal names, titles, troop numbers, casualty figures.
- Quotations. Never put words in a real person's mouth unless the quote is genuinely recorded — and if it is recorded only in a later chronicle, say so before quoting it.
- Documents, letters, laws or their contents.
- Causes and motives. If the record does not say WHY someone did something, say that the record does not say. Competing theories are told as competing theories, none of them settled.

WHAT YOU MAY AND SHOULD RECONSTRUCT — this is texture, not fabrication:
- The physical world: what the road felt like underfoot, how cold the armour was, how long the wait lasted, the weather the sources describe, the sound of a camp before dawn.
- Keep reconstruction sensory and unattributed. The moment you attach a reconstructed thought or line of speech to a named historical person, it stops being texture and becomes fabrication.

THE FAMOUS-VERSION TRAP — the most common way this channel would go wrong:
For many of these events the version everybody knows is an Edo-period embellishment, not the record. When your topic is one of them, name the gap out loud and give the documented version. Known examples:
- Nagashino 1575: the "three thousand guns in three rotating ranks" comes from 『信長記』 (Oze Hoan, 17th century). No contemporary source describes it. Guns and field fortifications are documented; the rotation is not.
- The cuckoo poem sorting Nobunaga, Hideyoshi and Ieyasu by temperament is a late-Edo senryū recorded in 『甲子夜話』 — over two centuries after all three died. It is not their words.
- Kenshin sending salt to Shingen is a cherished tradition with no contemporary documentation.
- The single-combat duel between Shingen and Kenshin at Kawanakajima comes from 『甲陽軍鑑』, a later and unreliable source.
- Hattori Hanzō was a spear commander of the Tokugawa, not a practising ninja.
When you hit one of these: state the popular version, say plainly it is a later story, then tell what the record actually supports. That contrast is more interesting than the myth, and it is the reason this channel exists.

- Name the era once, plainly, so the listener knows where they are standing: 平安, 鎌倉, 戦国, 江戸, 幕末, 明治.
- Popular-culture ninja and samurai are NOT the subject. No fireballs, no flying, no invincible swordsmen. The real craft is far more interesting and is what this channel is for.
- SELF-CHECK BEFORE OUTPUT: reread every factual claim and ask "which of a / b / c is this?". Any (c) gets deleted. Any (b) spoken as (a) gets rewritten with its doubt restored.`;

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

// Chất giọng của kênh lịch sử: chắc chắn, tự tin, hào hùng — thay cho chất trầm lắng mặc định của
// kênh Phật giáo. Vẫn giữ luật "vào bài không giật tít", nhưng nói rõ vào khẽ KHÁC với nói rụt rè,
// nếu không model sẽ hiểu "năng lượng thấp" thành "giọng yếu và ngập ngừng".
const HISTORY_REGISTER = `- Steady, assured, unhurried. The voice of someone who knows this material and does not need to raise it. Weight comes from certainty, never from volume.
- When telling moments of achievement: let the voice carry pride and determination.
- FOR TRAGIC TOPICS (disasters, famines, bombardments, mass loss): The voice carries profound solemnity, grief, and sorrow ([solemn], [sad], [mournful], [serious]). Deliver casualty figures, the cries of victims, and the grim devastation with deep, respectful gravity — neither sensational nor detached, but bearing the unbearable weight of real human suffering and irreplaceable loss.
- Never hushed, never soothing, never tentative. Entering quietly means starting without a hook, NOT speaking timidly. Every sentence lands like something the speaker is sure of.
- Where the record is uncertain, be just as firm about the uncertainty: 「そこは分かっていません。」 said plainly and without apology is stronger than a confident guess.
- Never hyped, never salesy, never a trailer voice. Confidence and theatrics are opposites here.`;

const HISTORICAL_5_ACT_STRUCTURE = `────────────────────────────────────────
CRITICAL REQUIREMENT: 5-ACT DRAMATIC STRUCTURE WITH OPENING HOOK & SILENT CHAPTER TITLE SLIDES
────────────────────────────────────────
Do NOT write the episode as a flat, monotonous chronological monologue. You MUST structure the video according to this cinematic structure:

1. SLIDE 1: VIDEO OPENING HOOK & TEASER (オープニング・導入と問いかけ)
   - Welcoming, intriguing greeting to the audience (e.g. 「皆さん、ようこそ...」).
   - 1-2 dramatic sentences teasing the high-stakes climax, dilemma, or mystery of the historical event to spark intense curiosity (e.g. 「もし関ヶ原のあの日、わずか一通の手紙が届かなかったとしたら…」).
   - Spoken narration in Japanese, rich bilingual subtitle, duration: 5-7s.
   - visualDescription: An expansive, epic establishing shot setting the overarching atmosphere and grand stakes.

2. FIVE DRAMATIC ACTS (五幕構成):
   - 【第一幕：発端・因果】 (Hồi 1: Khởi Nguồn & Bối Cảnh / Origins & Causes) — ~20% of segments
   - 【第二幕：動乱・激化】 (Hồi 2: Diễn Biến & Đối Đầu / Escalation & Mobilization) — ~25% of segments
   - 【第三幕：激突・天王山】 (Hồi 3: Cao Trào & Bước Ngoặt / Climax & Decisive Turning Point) — ~25% of segments
   - 【第四幕：結末・新秩序】 (Hồi 4: Kết Quả & Cục Diện Mới / Aftermath & New Order) — ~18% of segments
   - 【第五幕：残響・歴史の教訓】 (Hồi 5: Dư Âm & Bài Học Lịch Sử / Echoes & Historical Legacy) — ~12% of segments

3. INDEPENDENT CHAPTER TITLE SLIDES (layout: "chapter-title"):
   - The opening slide of EACH of the 5 Acts MUST be a STANDALONE CHAPTER TITLE SLIDE (5 title slides total).
   - Rules for Chapter Title slides:
     a) \`"layout": "chapter-title"\`.
     b) \`"act": 1\` (or 2, 3, 4, 5).
     c) \`"actTitle": "..."\` (e.g. "第一幕：発端・天下の均衡").
     d) \`"durationSeconds": 3\` (A clean 2-3 second pause on screen).
     e) \`"dialogueOrNarration": ""\` (EMPTY STRING - ABSOLUTELY NO SPOKEN NARRATION! The narrator is SILENT during this 3-second title card so the viewer absorbs the chapter title and dramatic title artwork with background music).
     f) \`"subtitle"\`: Bilingual title format with Act Tag:
        "subtitle": "【第一幕：発端】 **天下の均衡**\\n【Hồi 1: Khởi Nguồn】 **Mầm Mống Loạn Lạc**"
     g) "visualDescription": MUST BE WRITTEN AS A MONUMENTAL JAPANESE CHAPTER TITLE CARD ARTWORK WITH TITLE AT THE TOP:
        - Across the upper top portion of the frame: An elegant traditional horizontal Japanese calligraphy header / title inscription plaque reading the Act Title in brushed ink kanji, framed with subtle gold dust or decorative washi paper banner.
        - Main dramatic centerpiece in the lower-to-middle area: e.g. an antique calligraphy scroll (makimono) on dark wood, clan crest war banners (kamon), crossed katanas on a lacquer stand, a samurai commander helmet (kabuto), or an ornate war fan (gunbai).
        - Atmospheric details: drifting gold dust flecks, subtle ink-wash sumi-e splashes, soft dramatic lighting, keeping the upper portion dedicated to the monumental title header.
   - All subsequent slides within each Act are narrative slides with normal spoken narration, 5-second duration, and scene action.`;

export function buildJapaneseHistoryScriptPrompt(input, durationInfo, durationRange = '8_10m') {
  const isLandscape = (input.aspectRatio || '16:9') === '16:9';
  const themeObj = getJapaneseHistoryTheme(input.historyTheme || 'japan_history');
  const { slidesEn: targetSlides, minChars: targetChars } = targetFor(durationRange);

  // Nếu chủ đề được chọn từ kho có sẵn, kéo theo niên đại và cảnh báo sử liệu của chính bài đó.
  // Cảnh báo riêng cho từng bài đắt hơn hẳn cảnh báo chung: nó chỉ đúng vào chi tiết hay bị kể sai.
  const topic = findJapaneseHistoryTopic(input.scenario);
  const topicBlock = topic
    ? `
VERIFIED FRAMING FOR THIS EXACT TOPIC (from the channel's own topic library — trust this over your own recall):
- Period: ${topic.era}
- Evidence status: ${topic.status === 'record' ? 'DOCUMENTED — contemporary sources support the main account.' : topic.status === 'legend' ? 'LEGEND — there is no contemporary documentation. The episode must present this as a tradition, not as fact, starting in the first minute.' : 'MIXED — the event is real but the popular version contains later invention. You must separate the two out loud.'}
${topic.caution ? `- SPECIFIC WARNING FOR THIS EPISODE: ${topic.caution}` : ''}
`
    : '';

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
${topicBlock}
${sectionLanguage(VOCABULARY_NOTE)}

${sectionVoice(
    '「皆さん、ようこそ。もし関ヶ原のあの日、わずか一通の手紙が届かなかったとしたら…」 (Open with an intriguing, dramatic hook teaser and warm greeting, then proceed into the acts).',
    '- Keep the delivery captivating, respectful, and mysterious, sparking curiosity about the historical turning point.',
    HISTORY_REGISTER,
  )}

${sectionBanned(SUBJECT_REQUIREMENT)}

${sectionTags(
    ELEVENLABS_V3_TAGS_HISTORY,
    '- Segment 1 (Video Hook) should open with [confident] or [thoughtful] to intrigue the listener.',
    `
- REGISTER OF THESE TAGS: this is a history channel, so the tag set is deliberately firm rather than soothing. Use [serious] and [solemn] for the weight of an event, [confident] and [determined] where someone acts, [proud] where an achievement genuinely earns it, [thoughtful] and [curious] where the record is uncertain and you are weighing it.
- Do NOT reach for [proud] often. It lands only when the episode has already shown the listener what was accomplished; used early or repeatedly it turns the narration into a pep talk.`,
  )}

${HISTORICAL_5_ACT_STRUCTURE}

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
  "youtubeDescription": "関ヶ原の戦い。天下の命運が動いたあの日を、5つの幕に分けて語ります。\\n\\n#日本史 #歴史 #戦国時代 #侍 #武士道 #城",
  "theme": "${themeObj.key}",
  "coverPrompts": {
    "landscape": "On the stone forecourt of a Japanese castle in old Japan. On the right, a samurai in dark lacquered armour kneels with both hands resting on his knees, his long sword laid on a low wooden stand before him. On the left, wide open gravel running toward a tall stone wall and a castle keep beyond it. Bright overcast morning, soft even light.",
    "portrait": "Close-up on a plank floor inside a Japanese castle room. A single long sword resting on a dark wooden stand, its lacquered scabbard catching the flat daylight. Behind it, out of focus, a paper screen and one timber post. Early morning, soft grey light above and worn wood below.",
    "headline": "刀を置いた日",
    "sub": "関ヶ原の戦いからわずか七日",
    "kicker": "一六〇〇年 美濃"
  },
  "totalSegments": 25,
  "segments": [
    {
      "segmentNumber": 1,
      "durationSeconds": 6,
      "visualDescription": "Wide panoramic establishing shot of Mount Ibuki and the misty Sekigahara valley in old Japan. Low morning mist hovering over dark pine forests, distant fortress silhouette on a mountain ridge under dramatic overcast skies. Cinematic, epic historical atmosphere.",
      "dialogueOrNarration": "[confident] 皆さん、ようこそ。もし関ヶ原のあの日、わずか一通の手紙が届かなかったとしたら、日本の歴史はどうなっていたでしょうか。今日は、天下の命運を分けた知られざる真実へとお連れします。",
      "subtitle": "もし関ヶ原のあの日、**わずか一通の手紙が届かなかったら**…\\nNếu ngày Sekigahara năm ấy, **chỉ một phong thư không đến kịp**..."
    },
    {
      "segmentNumber": 2,
      "act": 1,
      "actTitle": "第一幕：発端・天下の均衡",
      "layout": "chapter-title",
      "durationSeconds": 3,
      "visualDescription": "A grand dramatic Japanese historical chapter title card artwork. Across the upper top portion, an elegant horizontal calligraphy header inscription reading 「第一幕：天下の均衡」 on antique washi parchment. In the lower-middle composition, an antique Japanese makimono scroll and a red lacquer seal on dark wood, flanked by ancient samurai clan crest banners and crossed katanas on a wooden rack. Delicate gold dust flecks drifting, dramatic lighting, epic chapter transition artwork.",
      "dialogueOrNarration": "",
      "subtitle": "【第一幕：発端】 **天下の均衡**\\n【Hồi 1: Khởi Nguồn】 **Mầm Mống Loạn Lạc**"
    },
    {
      "segmentNumber": 3,
      "act": 1,
      "durationSeconds": ${SECONDS_PER_IMAGE},
      "visualDescription": "In a dimly lit chamber of Osaka Castle in old Japan. Five elder lords seated formally on tatami mats before sliding screens painted with pine trees. In the center, rolled letters and vermilion seals on a low lacquer table. Tense, silent confrontation.",
      "dialogueOrNarration": "[serious] 慶長五年、太閤秀吉の死後、天下の均衡は音を立てて崩れ始めていました。",
      "subtitle": "太閤秀吉の死後、**天下の均衡は崩れ始めて**いました。\\nSau khi Hideyoshi qua đời, **thế cân bằng bắt đầu sụp đổ**."
    },
    {
      "segmentNumber": 8,
      "act": 2,
      "actTitle": "第二幕：動乱・関ヶ原へ",
      "layout": "chapter-title",
      "durationSeconds": 3,
      "visualDescription": "A dramatic Japanese war chapter title card artwork. Across the upper top portion, bold brushed calligraphy title lettering reading 「第二幕：進軍の狼煙」 against an ink-wash cloud background. In the lower-middle composition, a weathered wooden war command fan (gunbai) and flapping samurai war banners with bold clan mon crests against dark stormy clouds and distant lightning. Cinematic composition, gold flecks and flying cherry blossom petals, epic chapter transition art.",
      "dialogueOrNarration": "",
      "subtitle": "【第二幕：動乱】 **進軍の狼煙**\\n【Hồi 2: Diễn Biến】 **Khói Lửa Tiến Quân**"
    }
  ]
}
`.trim();
}
