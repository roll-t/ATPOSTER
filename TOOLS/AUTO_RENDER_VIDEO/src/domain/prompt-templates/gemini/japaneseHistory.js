import { getJapaneseHistoryTheme } from '../../content/japaneseHistoryThemes.js';
import { findJapaneseHistoryTopic } from '../../content/japaneseHistorySyllabus.js';
import { isJapaneseHistoryWarTopic } from '../../content/buildSegmentedPrompts.js';
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
 * Dựng trên bộ luật của kênh kể chuyện lịch sử: nhịp 5 giây một ảnh, đếm độ dài bằng ký tự, tag ElevenLabs v3,
 * phụ đề Nhật-Việt, luật viết visualDescription kèm bảng đổi đồ vật sang Nhật, luật cấm giọng ru ngủ / self-help,
 * khối đăng video, hai prompt ảnh bìa.
 *
 * ĐẶC BIỆT: Nếu là đề tài CHIẾN TRANH / CHIẾN TRẬN (Sengoku, Sekigahara, công thành, samurai xung trận...),
 * prompt hình ảnh chuyển sang phong cách CHIẾN TRẬN HOÀNH TRÁNG (Epic Battle Art) — kỵ binh, bộ binh giáo dài,
 * súng hoả mai khói mù, cờ lệnh xé gió, loại bỏ hoàn toàn các mô tả làng quê tĩnh lặng "chill chill".
 *
 * RÀNG BUỘC SỬ LIỆU: không được bịa sử. Xem SUBJECT_REQUIREMENT bên dưới.
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
- It is NOT a fantasy anime channel (no magical fireballs, no wire-fu flying). HOWEVER, FOR WAR, BATTLE & MILITARY EPISODES (e.g. Sengoku campaigns, samurai wars, sieges, clashes): FULLY EMBRACE GRAND MILITARY SCALE, DYNAMIC MARTIAL INTENSITY, AND BATTLEFIELD REALISM. Depict massive armies, locked spear formations, cavalry charges, fiery castle sieges, matchlock volleys, and commanding warlords with epic cinematic visual gravitas.
- AND FOR TRAGIC / DISASTER HISTORY EPISODES: DIRECTLY ADDRESS AND DETAIL the documented casualty numbers, the extreme suffering of the victims, and the harrowing human toll recorded in official chronicles without sanitizing history.`;

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

const WAR_WORLD_LIST = `WHAT APPEARS IN WAR & BATTLE EPISODES (MANDATORY EPIC COMBAT & MILITARY SCALE — NO CHILL VILLAGES):
- Armored warriors & military formations: elite samurai commanders and warlords in ornate horned kabuto helmets, fierce menpō battle masks, and heavy lacquered armor (yoroi) waving gold-leaf war fans (gunbai); cavalry charges on armored horses with drawn katanas and fluttering clan back-flags (sashimono); dense ranks of ashigaru foot soldiers in conical jingasa helmets advancing with locked 5-meter yari spears; matchlock arquebusiers (teppo) kneeling behind wooden pavises and firing through billowing gunsmoke; archers drawing heavy yumi war bows.
- Battlefield environments & fortifications: expansive battle plains under dark stormy skies, fortified hilltops with tiered jinmaku war curtains, castle keeps under heavy siege with burning timber gates, barricades of sharpened wooden stakes (umadome), watchtowers, military encampments with hundreds of fluttering clan crest banners (nobori and hata-jirushi).
- Combat actions & martial details: vanguard clashes, spear walls locked in combat, cavalry flanking maneuvers, flaming arrow volleys arcing across the sky, dense gunsmoke clouds, flying sparks and embers, trampled mud, horn trumpets (horagai) sounding, battle drums (taiko), dramatic commander standoffs, and harrowing battlefield aftermaths with scattered weapons and smoldering battlements.
- STRICTLY FORBIDDEN FOR WAR EPISODES: DO NOT draw peaceful rural rice paddies, quiet thatched cottages, village women strolling with straw sandals, or chill villagers drinking tea. Every slide must reflect the high-stakes drama, martial tension, and kinetic energy of feudal warfare.`;

const PEACEFUL_WORLD_LIST = `WHAT MAY APPEAR (for non-war, cultural or everyday history episodes):
- Samurai retainers in formal kamishimo with two swords at the waist, noble lords and court ladies in layered silk kimono, government magistrates before unrolled scrolls, couriers and travellers in straw hats, master craftsmen, monks, scholars and merchants.
- Castle keeps above stone ramparts, grand daimyo residences with tatami rooms and painted cedar sliding screens, bustling market streets under deep tiled eaves, mountain post roads and waystations, harbour docks with wooden trade ships.
- Period objects: long and short swords on lacquered stands, rolled maps and calligraphy scrolls, ink stones and bamboo brushes, ceramic tea bowls, formal folding fans.`;

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
     d) \`"durationSeconds": 4\` (A clean 3-4 second transition on screen).
     e) \`"dialogueOrNarration"\`: MUST HAVE CONCISE, DRAMATIC SPOKEN NARRATION!
        - DO NOT LEAVE EMPTY! When the chapter banner appears on screen, the narrator solemnly reads out the Act and chapter title to maintain natural, continuous narration flow throughout the video (avoiding dead silence or awkward interruptions).
        - Format: Start with [solemn] or [serious] emotion tag, then speak the Act and Title in natural, solemn Japanese (e.g. "[solemn] 第一幕、発端。天下の均衡。" or "[solemn] 第二幕、動乱。進軍の狼煙。").
        - Keep it brief (approx. 12–25 characters, ~2–4 seconds of speech) so it acts as a punchy, dignified chapter announcement before the detailed narrative begins.
     f) \`"subtitle"\`: Bilingual title format with Act Tag:
        "subtitle": "【第一幕：発端】 **天下の均衡**\\n【Hồi 1: Khởi Nguồn】 **Mầm Mống Loạn Lạc**"
     g) "visualDescription": MUST BE WRITTEN AS A CLOSE-UP FOREGROUND CHAPTER TITLE BANNER:
        - In the immediate foreground close to the viewer (dominant focal centerpiece): A large, tall traditional Japanese samurai war banner (vertical nobori battle flag made of coarse textured hemp fabric on a wooden pole with crossbeam) stands prominently in the center of the frame, occupying the central vertical height of the picture.
        - Written directly ON the flag fabric: The Act Title is painted vertically top-to-bottom in bold black sumi brush calligraphy directly onto the woven cloth surface of this large foreground banner (e.g. 「第一幕：天下の均衡」). The kanji characters follow the vertical drape and fabric texture of the flag. There is NO floating text, NO horizontal text across the screen.
        - Soft distant background: Behind the large foreground banner, a soft, distant watercolour background of misty mountains, distant castle ramparts, or faint silhouettes of army banners under a soft pale morning sky, kept quiet and far away so the large foreground banner dominates.
   - All subsequent slides within each Act are narrative slides with normal spoken narration, 5-second duration, and scene action.`;

export function buildJapaneseHistoryScriptPrompt(input, durationInfo, durationRange = '8_10m') {
  const isLandscape = (input.aspectRatio || '16:9') === '16:9';
  const themeObj = getJapaneseHistoryTheme(input.historyTheme || 'japan_history');
  const { slidesEn: targetSlides, minChars: targetChars } = targetFor(durationRange);
  const isWar = isJapaneseHistoryWarTopic(input, [input.scenario, input.script].join(' '));

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
    worldOpeners: isWar
      ? '"Across the foggy battlefield of Sekigahara in old Japan," / "Before the towering stone ramparts of a besieged castle in feudal Japan," / "At the frontline of a Sengoku army clash in old Japan," / "Inside the command encampment (honjin) surrounded by fluttering clan war banners,"'
      : '"Inside the keep of a Japanese castle," / "On a post road through a mountain pass in old Japan," / "In the dirt courtyard of a samurai residence,"',
    peopleExamples: isWar
      ? '"An imposing samurai warlord in horned kabuto helmet and dark lacquered yoroi armor, shouting orders with a gold-leaf war fan (gunbai)." "A charging formation of armored samurai cavalry with drawn katanas and fluttering clan back-flags (sashimono)." "Ranks of ashigaru spearmen advancing in tight formation with lowered 5-meter yari spears." "Matchlock gunners aiming through dense clouds of white gunsmoke behind wooden palisades."'
      : '"A samurai in dark lacquered armour with wide shoulder plates, hair tied in a topknot." "A foot soldier in a plain conical helmet and quilted coat." "A court noble in stiff wide-shouldered formal robes."',
    worldList: isWar ? WAR_WORLD_LIST : PEACEFUL_WORLD_LIST,
    themeBlock,
    compositionGuidance: compositionGuidanceFor(isLandscape),
    isWar,
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
    "landscape": "Across the smoke-veiled battlefield of Sekigahara in old Japan. An imposing samurai warlord in dark lacquered armor and a grand horned kabuto helmet sits on a folding camp stool on a grassy hill, holding a gold-leaf war command fan. Behind him, dense ranks of armored samurai stand ready with tall fluttering clan crest banners against a dramatic overcast sky with drifting smoke and fiery embers.",
    "portrait": "Close-up of an imposing feudal samurai commander in full battle armor. Fierce gaze, ornate horned kabuto helmet with gold crescent crest, iron menpō face mask hanging, lacquered shoulder plates tied with thick red silk cords. Behind him, dark stormy skies and tall war banners snapping in wind.",
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
      "durationSeconds": 4,
      "visualDescription": "A grand Japanese historical chapter title card in ink-and-watercolour style. In the immediate foreground, positioned close to the viewer in the center of the frame, a large and tall traditional Japanese samurai war banner (vertical nobori flag of coarse woven hemp cloth on a wooden pole) stands prominently as the main subject, occupying the full vertical height of the picture. Inscribed vertically top-to-bottom in bold black sumi brush calligraphy directly onto the textured cloth surface of this large foreground banner is the Act Title: 「第一幕：天下の均衡」. The kanji characters are physically painted on the fabric following the vertical drape of the cloth. Behind the large banner in the soft, distant background: faint silhouettes of distant castle walls and pine trees under a pale morning sky, keeping the background quiet and distant. Absolutely no floating horizontal text.",
      "dialogueOrNarration": "[solemn] 第一幕、発端。天下の均衡。",
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
      "durationSeconds": 4,
      "visualDescription": "A dramatic Japanese war chapter title card in ink-and-watercolour style. In the immediate foreground, positioned close to the camera in the center of the frame, a large weathered samurai battle banner (tall vertical nobori flag of woven cloth on a wooden pole) stands prominently, filling the central vertical span of the picture. Brushed vertically top-to-bottom in vigorous black ink calligraphy directly onto the textured banner cloth is the Act Title: 「第二幕：進軍の狼煙」. In the soft distant background far behind the banner: distant morning mist, faint silhouettes of distant army spears, and soft clouds, keeping the large foreground flag as the clear commanding subject. Absolutely no floating horizontal text.",
      "dialogueOrNarration": "[serious] 第二幕、動乱。進軍の狼煙。",
      "subtitle": "【第二幕：動乱】 **進軍の狼煙**\\n【Hồi 2: Diễn Biến】 **Khói Lửa Tiến Quân**"
    }
  ]
}
`.trim();
}
