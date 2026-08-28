import { CHARS_PER_SECOND_JA_SLOW } from '../../../speechRate.js';

/**
 * Phần DÙNG CHUNG của mọi skill kể chuyện tiếng Nhật dựng bằng tranh mực-màu nước.
 *
 * Hiện có hai skill dùng file này:
 *   - buddhist_wisdom  (Chuyện Triết Lý & Thiền Phật Giáo)
 *   - japanese_history (Lịch Sử Nhật Bản, Samurai & Ninja)
 *
 * Hai skill khác nhau ở BỐI CẢNH và NHÂN VẬT, còn mọi thứ khác thì giống hệt: ảnh chạy theo độ dài
 * giọng đọc của chính slide đó, đếm độ dài bằng ký tự, tag ElevenLabs v3, phụ đề Nhật-Việt, luật
 * viết visualDescription, luật cấm giọng ru ngủ / self-help, khối đăng video, hai prompt ảnh bìa.
 *
 * VÌ SAO PHẢI TÁCH RA: những khối này là phần tốn nhiều vòng sửa nhất — luật cấm văn phong AI tiếng
 * Nhật, luật "mọi cảnh phải là Nhật" kèm bảng đổi đồ vật, mốc mở đầu, cách đếm ký tự. Chép chúng
 * sang skill thứ hai nghĩa là mỗi lần sửa phải nhớ sửa hai chỗ, và lệch kiểu này KHÔNG BÁO LỖI —
 * chỉ là một hôm nào đó một skill sinh ra kịch bản tệ hơn skill kia mà không ai biết vì sao.
 */

// Tag ElevenLabs v3 hợp lệ, lọc lại còn những tag hợp với một bài kể chuyện trầm lắng.
// Cố ý KHÔNG để [laughs], [excited], [shouting]... vào đây: model rất hay chèn bừa tag cảm xúc
// mạnh, mà v3 sẽ diễn đúng như vậy. Tag ngoài whitelist này bị cấm hẳn, vì v3 đọc TO những tag nó
// không nhận ra thành lời.
export const ELEVENLABS_V3_TAGS = [
  '[whispers]', '[sighs]', '[exhales]', '[inhales deeply]',
  '[thoughtful]', '[curious]', '[chuckles]', '[sad]',
  '[short pause]', '[long pause]',
];

// Bộ tag riêng cho skill LỊCH SỬ. Kênh lịch sử cần giọng chắc chắn, tự tin, hào hùng — nên bộ trên
// (vốn dựng cho kênh Phật giáo trầm lắng) đọc lên nghe do dự và yếu, sai hẳn thể loại.
//
// Vì sao chọn được những tag này dù chúng không nằm trong danh sách ví dụ của tài liệu ElevenLabs:
// tài liệu v3 nói rõ danh sách đó chỉ là ví dụ và khuyến khích dùng thêm "descriptive emotional
// states" — các tag mô tả trạng thái cảm xúc bằng tính từ thường. [serious], [solemn], [proud],
// [confident], [determined] đều thuộc dạng đó và được dùng phổ biến cho lời dẫn phim tài liệu.
// KHÔNG thêm tag lạ ngoài danh sách này: v3 đọc TO những tag nó không nhận ra thành lời.
export const ELEVENLABS_V3_TAGS_HISTORY = [
  '[serious]', '[solemn]', '[confident]', '[determined]', '[proud]',
  '[thoughtful]', '[curious]', '[sighs]', '[exhales]',
  '[short pause]', '[long pause]',
];

// Số giây TRUNG BÌNH của một ảnh. Đây KHÔNG phải thời gian hiển thị thật.
//
// Thời gian thật của mỗi ảnh là ĐỘ DÀI FILE GIỌNG ĐỌC CỦA CHÍNH SLIDE ĐÓ: Root.tsx của skill
// Remotion đo từng file audio/scene-NN.* rồi mới quyết định số khung hình (xem calculateMetadata),
// và render-project.mjs cố tình KHÔNG truyền durationSeconds xuống scene để không đè lên phép đo
// đó. Đoạn nói 2 giây thì ảnh giữ 2 giây, đoạn 8 giây thì giữ 8 giây — không cắt, không kéo.
//
// Con số này chỉ dùng để LẬP KẾ HOẠCH: đổi "video 8-10 phút" ra số slide phải viết và số ảnh phải
// sinh bên Google Flow. Vì vậy prompt được phép nói "một slide thường dài chừng ngần này" nhưng
// KHÔNG được ép mọi slide vừa đúng khuôn — xem sectionLength() bên dưới.
export const SECONDS_PER_IMAGE = 5;

// Số slide nằm trong "30 giây đầu" — phần mở đầu phải vào thật khẽ.
export const OPENING_SEGMENTS = Math.round(30 / SECONDS_PER_IMAGE);

// Biên độ cho phép quanh con số lý thuyết, để Gemini còn chỗ co giãn theo mạch chuyện.
const SPREAD = 0.12;

function targetsFor(seconds) {
  const slides = seconds / SECONDS_PER_IMAGE;
  const chars = seconds * CHARS_PER_SECOND_JA_SLOW;
  const range = (n) => `${Math.round(n * (1 - SPREAD))} đến ${Math.round(n * (1 + SPREAD))}`;
  // Bản TIẾNG ANH của cùng khoảng số, dành riêng cho prompt gửi Gemini. Trước đây prompt tiếng Anh
  // nội suy thẳng chuỗi có chữ "đến" vào giữa câu ("Produce exactly 74 đến 94 segments") — model
  // vẫn đoán ra, nhưng đó là một từ tiếng Việt lạc giữa một bản chỉ dẫn tiếng Anh chặt chẽ.
  const rangeEn = (n) => `${Math.round(n * (1 - SPREAD))} to ${Math.round(n * (1 + SPREAD))}`;
  return {
    slides: range(slides),
    chars: range(chars),
    slidesEn: rangeEn(slides),
    charsEn: rangeEn(chars),
    minChars: Math.round(chars * (1 - SPREAD)),
  };
}

// Số slide / số KÝ TỰ mục tiêu theo từng mốc thời lượng. Số ký tự suy ra TỪ CHÍNH LỜI NÓI:
// giây × CHARS_PER_SECOND_JA_SLOW (đo thật trên giọng ElevenLabs tiếng Nhật). Nhờ vậy ba con số
// luôn khớp nhau — tổng ký tự, số slide, và thời lượng thật của audio.
export const DURATION_TARGETS = {
  under_1m: targetsFor(45),
  '1_2m': targetsFor(90),
  '2_3m': targetsFor(150),
  '3_4m': targetsFor(210),
  '4_6m': targetsFor(300),
  '6_8m': targetsFor(420),
  '8_10m': targetsFor(540),
  '10_15m': targetsFor(750),
  '15_20m': targetsFor(1050),
};

export const CHARS_PER_SLIDE_LOW = Math.round(SECONDS_PER_IMAGE * CHARS_PER_SECOND_JA_SLOW * 0.85);
export const CHARS_PER_SLIDE_HIGH = Math.round(SECONDS_PER_IMAGE * CHARS_PER_SECOND_JA_SLOW * 1.2);

const DEFAULT_TARGET = DURATION_TARGETS['8_10m'];

export function targetFor(durationRange) {
  return DURATION_TARGETS[durationRange] || DEFAULT_TARGET;
}

/** Số KÝ TỰ tối thiểu của một kịch bản ở mốc thời lượng này (cận dưới của bảng trên). */
export function getCharTarget(durationRange) {
  return targetFor(durationRange).minChars;
}

/** Khoảng ký tự của một slide ĐIỂN HÌNH (~5 giây lời nói) — dùng chung cho prompt viết mới và viết
 * bù. Là mức THAM CHIẾU, không phải trần: slide dài ngắn bao nhiêu thì ảnh giữ bấy nhiêu. */
export function getCharsPerSlide() {
  return { low: CHARS_PER_SLIDE_LOW, high: CHARS_PER_SLIDE_HIGH };
}

/** Số slide (= số ảnh, = số prompt ảnh) mục tiêu — dạng tiếng Anh, chỉ dùng trong prompt. */
export function getSlideTarget(durationRange) {
  return targetFor(durationRange).slidesEn;
}

// Nhãn hiển thị của ô "Thời lượng mục tiêu", SINH RA TỪ chính DURATION_TARGETS. Trước đây gõ tay
// trong ContentForm.js và đã lệch hẳn khỏi thực tế sau hai lần đổi thông số.
const DURATION_LABELS = {
  '4_6m': 'Từ 4 - 6 phút',
  '6_8m': 'Từ 6 - 8 phút',
  '8_10m': 'Từ 8 - 10 phút',
  '10_15m': 'Từ 10 - 15 phút',
  '15_20m': 'Từ 15 - 20 phút',
};

export function getDurationOptions() {
  return Object.entries(DURATION_LABELS).map(([value, label]) => {
    const t = DURATION_TARGETS[value];
    return { value, label: `${label} (${t.slides} slide tranh, ${t.chars} ký tự)` };
  });
}

/** Mục 0 — ngôn ngữ. Giống hệt nhau ở mọi skill kể chuyện tiếng Nhật. */
export function sectionLanguage(vocabularyNote) {
  return `────────────────────────────────────────
0. LANGUAGE — READ THIS FIRST
────────────────────────────────────────
- "dialogueOrNarration" is written in JAPANESE. Natural spoken Japanese, not translated-from-English Japanese.
- The topic above may be given in English or Vietnamese. That is only the brief. Do not translate it word for word — write the episode fresh in Japanese as a Japanese speaker would tell it.
- Use ですます調 throughout: warm and polite, the way a calm person speaks to one listener. Never である調, never written-report style.
- Write numbers as words when they are spoken (「三歩」 not 「3歩」). The text goes straight into a text-to-speech engine.
- "visualDescription", "coverPrompts" and the English style fields stay in ENGLISH — they are fed to an image generator that only understands English. Everything the listener HEARS is Japanese; everything a machine reads to draw a picture is English.
${vocabularyNote}`;
}

/**
 * Mục 1 — giọng kể. Dòng định vị kênh do từng skill tự khai, phần còn lại dùng chung.
 *
 * `registerLines` cho phép skill đổi HẲN chất giọng: kênh Phật giáo cần trầm lắng và dịu, kênh
 * lịch sử cần chắc chắn và hào hùng. Bỏ trống thì dùng chất giọng trầm lắng mặc định.
 */
export function sectionVoice(openingRightExample, openingWrongExamples, registerLines = null) {
  const register = registerLines || `- Slow, low, unhurried, kind. Long enough silences that the listener can breathe. Never hyped, never dramatic, never salesy.`;
  return `────────────────────────────────────────
1. VOICE: A PERSON TELLING A STORY, NOT A DOCUMENTARY
────────────────────────────────────────
- Everything you write in "dialogueOrNarration" will be read aloud. Write for the ear, never for the page.
- One person talking to ONE listener, not a lecturer addressing a hall.
${register}
- Use 「あなた」 sparingly — Japanese drops the second person far more than English. Address the listener through the shape of the sentence, not by naming them every line.
- Vary the rhythm. A long, flowing sentence, then a short one. Sometimes a fragment. Silence is part of the writing.
- Tell the story in scenes with concrete physical detail — the weight of a wet robe, mud on the road, the smell of rain on hot stone. Let the meaning arrive through what happens, not through you announcing what it means.
- Ask the listener a real question now and then, then leave room instead of answering it immediately.
- Never say the point twice. Say it once, quietly, and stop.

THE FIRST 30 SECONDS — ENTER QUIETLY (segments 1 to ${OPENING_SEGMENTS}):
- The episode does not start. It is already going, and the listener just walked in on it. Someone is halfway through a thought, speaking low.
- Start at the lowest energy in the whole episode. Nothing loud, nothing announced, no hook, no promise of what's coming, no 「今日は〜についてお話しします」. Never name the theme in the first sentence.
- Open on one small concrete thing instead of an idea — rain starting on a roof, a man taking his shoes off at the door, grass bending in the wind. One image, described plainly.
- The first sentence must be short. Under 25 Japanese characters. Let it sit.
- No question in segment 1. No dramatic statement. Earn the story with an image first.
- Segments 1 to ${OPENING_SEGMENTS} sit at the LOW end of the character range (around ${CHARS_PER_SLIDE_LOW} characters). Energy rises very slightly over the first few minutes and never gets loud.
${openingWrongExamples}
- Right: ${openingRightExample}`;
}

/**
 * Mục 2 — văn phong cấm. Đây là khối tốn nhiều vòng sửa nhất và phải giống hệt nhau ở mọi skill.
 *
 * `subjectRequirement` là chỗ DUY NHẤT khác nhau: skill Phật giáo đòi gọi tên giáo lý, skill lịch
 * sử đòi trung thực với sử liệu.
 */
export function sectionBanned(subjectRequirement) {
  return `────────────────────────────────────────
2. BANNED WRITING PATTERNS (THIS IS THE MOST IMPORTANT SECTION)
────────────────────────────────────────
The script must not read like it was generated. Every pattern below is a known tell in Japanese AI writing. Avoid all of them.

BANNED VOCABULARY AND PHRASES — do not use these anywhere in the narration:
  まさに、非常に、極めて、大変重要な、〜と言えるでしょう、〜と言えます、〜ではないでしょうか（繰り返し使うこと）、
  〜のではないかと思われます、いかがでしたか、いかがでしたでしょうか、まとめると、最後に、結論として、
  現代社会において、今の時代、私たちは〜しがちです、〜することが大切です、深い学び、大きな気づき、
  心の豊かさ、真の意味での、〜という側面、〜において重要な役割を果たす、古来より伝わる、実は〜なのです。

BANNED REGISTER — THE TWO WAYS THIS CHANNEL GOES WRONG:

a) NO BEDTIME, ANYWHERE. The listener is not in bed and is not going to sleep. Never write:
   おやすみなさい、良い夢を、ぐっすり、眠りに落ちて、目を閉じてください、布団、枕、
   安らかな夜をお過ごしください、また次の静かな夜にお会いしましょう、深い眠りの中に、
   今夜は〜してください、身を委ねてください。
   The words 夜 / 眠り may appear only INSIDE the story being told (a traveller walking at dusk), never
   as something you tell the listener to do.

b) NO SELF-HELP COACHING. You are not handing out a technique, an exercise or an assignment:
   〜してみませんか as disguised advice、そっと下ろしてみましょう、あなた自身のために、
   自分を大切に、心の荷物、深呼吸をして、肩の力を抜いて、今日から〜できます、
   〜するだけで楽になります。
   A real question to the listener is allowed, but it must stay an open question, never a
   instruction wearing a question mark.

c) THE EPISODE ENDS WHEN THE STORY ENDS. No wind-down, no closing ritual, no send-off, no
   invitation to breathe or relax. AT MOST TWO segments after the story lands. An episode that
   spends its last twenty segments soothing the listener has stopped being what it claims to be.

BANNED SENTENCE PATTERNS:
  a) Negative parallelism. No 「単なる川ではなく、鏡なのです」. No 「勝つことではなく、今ここにいることです」. This construction is the single loudest AI tell — zero instances allowed.
  b) The rule of three. Do not stack three adjectives, three nouns, or three clauses for rhythm (「静かで、穏やかで、自由な」). Use one or two. If you catch yourself writing a third, cut it.
  c) Explanatory tails. Never end a sentence with 「〜ということを教えてくれています」「〜ということなのかもしれません」「〜ということの大切さを示しています」. Stop the sentence at the period.
  d) 体言止め overuse. At most two in the whole script.
  e) Vague attribution. No 「研究によると」「専門家は言います」「一般的に言われています」. If something comes from a named source, name it plainly. If you are not certain a quote or citation is real, do not write it — invent nothing.
  f) Summary sentences. Do not end a segment by restating what the segment just said. No wrap-up segment at the end that recaps the episode.
  g) The 「困難はあるものの、未来は明るい」 shape. No optimistic-speculation ending.
  h) Formulaic openers. Do not begin with 「皆さんは〜と思ったことはありませんか」「想像してみてください」 or a dictionary definition.
  i) No markdown emphasis, no bold, no headings, no bullet points inside the narration. It is speech, not a document.
  j) No English words in the narration unless they are fully naturalised loanwords a Japanese speaker would actually say out loud.

HOW TO DECIDE, LINE BY LINE — use this test, not just the word lists above. The lists are examples;
Japanese inflects too many ways for any list to be complete.

  For every sentence you write, ask: is this about THE STORY, or is it about THE LISTENER'S body,
  evening or mood right now?
    - About the story -> keep it.
    - About the listener's body, breath, posture, bed, sleep, dreams or evening -> DELETE IT,
      however it is phrased.

  Concretely, delete any sentence that:
    - tells the listener to do something physical — breathe, close their eyes, relax, lie down,
      set something down, sink into anything;
    - wishes the listener something — a good night, sweet dreams, a peaceful evening, rest,
      「〜ますように」 aimed at the listener;
    - promises to meet them again next time;
    - contains 眠 / 夢 / 布団 / 枕 / 休 while ADDRESSED TO THE LISTENER rather than describing
      someone inside the story;
    - frames the subject as self-improvement the listener should buy into — 「あなた自身のために」、
      「自分を大切に」、「楽になれます」、「人生が変わります」.

  Worked examples from a real broken episode — every one of these must be deleted:
    「そっと、その重い荷物を、下ろしてみませんか。」        (an instruction wearing a question mark)
    「今夜も、穏やかな夢が、あなたを包みますように。」      (wishing the listener a good night)
    「心地よい眠りの中に、深く沈んでいってください。」      (sending the listener to sleep)
    「それでは、また次の、静かな夜にお会いしましょう。」    (a send-off)
    「あなたの心の中には、今、どんな荷物がありますか。」    (pop-psychology 心の荷物, not a real idea)

${subjectRequirement}

SELF-CHECK BEFORE YOU OUTPUT: reread every segment and delete any sentence that could sit unchanged in a generic inspirational video. If a line feels smooth but says nothing, cut it.`;
}

/**
 * Mục 3 — tag ElevenLabs v3.
 *
 * `tags` và `openingRule` khác nhau giữa các skill: kênh Phật giáo mở bằng giọng thì thầm, kênh
 * lịch sử mở bằng giọng chắc chắn. Mọi luật còn lại (cấm tag lạ, mật độ, chỗ đặt tag) là chung.
 */
export function sectionTags(tags, openingRule, registerNote = '') {
  return `────────────────────────────────────────
3. ELEVENLABS V3 AUDIO TAGS
────────────────────────────────────────
The narration gets read by ElevenLabs v3, which acts on bracketed audio tags. The tags stay in English even though the speech is Japanese — that is how v3 works.
- ALLOWED TAGS — use only these exact strings, nothing else:
  ${tags.join('  ')}
- Any other bracketed tag is forbidden. ElevenLabs reads unknown tags OUT LOUD as words, which ruins the take. Never invent tags like [calm voice], [meditative], [pause 2s], [music].
- Placement: put the tag immediately BEFORE the sentence it should colour, on the same line as the text.
- Density: about one tag every 3 to 5 sentences. Many segments should contain no tag at all. Never put two tags next to each other, and never open every segment with a tag — it makes the whole episode sound mechanical.
${openingRule}
- For pauses, prefer 「……」 inside the sentence. v3 does not support SSML break tags, so never write <break>. Use [short pause] or [long pause] only at a genuine turning point, at most two or three times in the whole episode.
- Tags belong ONLY in "dialogueOrNarration". The "subtitle", "title" and "visualDescription" fields must never contain a bracketed tag.${registerNote}`;
}

/** Mục 3 cho kênh kể chuyện trầm lắng (Phật giáo & Thiền). */
export const SECTION_TAGS = sectionTags(
  ELEVENLABS_V3_TAGS,
  '- Segment 1 must open with [whispers] or [thoughtful] so the voice starts low and close to the microphone. Never open the episode with [curious], [excited] or any tag that lifts the energy.',
);

/** Mục 4 — độ dài, đếm bằng ký tự tiếng Nhật. */
export function sectionLength(durationInfo, targetSlides, targetChars, honestFillOptions) {
  return `────────────────────────────────────────
4. LENGTH AND PACING — COUNTED IN JAPANESE CHARACTERS
────────────────────────────────────────
- Target duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- Produce ${targetSlides} segments. One segment = one painted image. The segment count IS the number of illustrations that have to be generated, so stay inside that range.

HOW LONG EACH IMAGE STAYS ON SCREEN — READ THIS BEFORE YOU WORRY ABOUT SEGMENT LENGTH:
- Every image is held for exactly as long as ITS OWN narration takes to say. The renderer measures the finished audio clip of each segment and gives that picture exactly that much screen time. There is no fixed shot length: a two-second line gets a two-second shot, an eight-second line gets an eight-second shot. Nothing is ever cut off, and nothing is ever padded out with silence.
- Therefore a segment is a UNIT OF MEANING, not a character budget. Cut where the PICTURE should change. One sentence may run across two or three segments when it walks the listener through two or three images; one segment may carry two short sentences when they both belong to the same picture.
- ${CHARS_PER_SLIDE_LOW} to ${CHARS_PER_SLIDE_HIGH} Japanese characters (about ${SECONDS_PER_IMAGE} seconds of slow speech) is the TYPICAL segment, and most of the episode should sit near it so the video keeps moving instead of resting on long static shots. Going shorter or longer where the meaning asks for it is correct, not a mistake. The only thing that must never happen is a segment ending mid-word.

THE ONE HARD NUMBER:
- TOTAL: across all segments the script must reach **at least ${targetChars} Japanese characters** of spoken text. Count every kana and kanji; punctuation counts, audio tags do not.
- BEFORE YOU RETURN: count the total, then count the segments. If the total is short, the fix is MORE SEGMENTS carrying the story further — never a handful of bloated ones.
- The last segment is a real segment carrying real material, not a sign-off. Never return it empty or as a single word.

HOW TO REACH THE TOTAL HONESTLY:
- Segments are short, so the story must actually go somewhere across ${targetSlides} of them. Do not stretch a thin idea over the whole episode and do not repeat a beat you have already covered.
- When you need more material, go further into the scene rather than padding: what the road smelled like, what he did with his hands, how long the silence lasted before anyone spoke. Concrete detail is what fills a script honestly.
- A segment is one short breath, not a paragraph. A long sentence running across two or three segments is normal and good — the picture simply changes mid-sentence, and each of those pictures gets exactly the time its own words need.
- Keep each sentence short enough to say in one breath.
- Give the episode a shape: a quiet opening that eases the listener in (see THE FIRST 30 SECONDS above), a story that unfolds without rushing, and an ending that lands on one image and stops. No recap, no wind-down, no send-off.

- WHEN THE STORY RUNS OUT BEFORE THE SEGMENTS DO — this is the trap that has already broken one episode. A single story is short; ${targetSlides} segments is long. The moment you feel the story ending with segments left over, the honest fix is MORE REAL MATERIAL, never softer material:
${honestFillOptions}
  The dishonest fix — the one you must not take — is filling the last twenty segments with 「深呼吸をして」「今夜はゆっくり休んでください」「おやすみなさい」. That turns the episode into a sleep track, and it is the single worst failure this prompt is guarding against.`;
}

/** Mục 5 — phụ đề Nhật trên, Việt dưới. */
export const SECTION_SUBTITLES = `────────────────────────────────────────
5. SUBTITLES — JAPANESE ON TOP, VIETNAMESE UNDERNEATH
────────────────────────────────────────
Every segment needs a "subtitle" with two lines:
  Line 1: the spoken Japanese, trimmed to a short on-screen line (15 to 30 characters), with 1 or 2 key phrases wrapped in **double asterisks**.
  Line 2: a literal "\\n" then a natural Vietnamese translation, also with the matching phrase in **double asterisks**.
The Vietnamese line is for the CREATOR, who does not read Japanese and needs to understand what is being published. Keep it warm and plain — spoken Vietnamese, not translated-textbook Vietnamese. No audio tags on either line.`;

/**
 * Mục 6 — luật viết visualDescription.
 *
 * Phần "mọi cảnh phải là Nhật" kèm bảng đổi đồ vật là chỗ đã phải sửa nhiều lần nhất (ảnh trả về
 * toàn học giả châu Âu với sách bìa da), nên bắt buộc dùng chung. Chỉ danh sách "thế giới của tập
 * này" và menu motif là khác nhau giữa các skill.
 */
export function sectionVisual({ worldOpeners, peopleExamples, worldList, themeBlock, compositionGuidance }) {
  return `────────────────────────────────────────
6. WHAT GOES IN "visualDescription" (ENGLISH)
────────────────────────────────────────
WRITE SUBJECT ONLY. DO NOT WRITE STYLE WORDS.
- The pipeline appends the art style (ink and watercolour, palette, paper, lighting) to every image prompt automatically. If you also write "ink lines, warm amber washes, rice paper" into visualDescription, the style ends up stated twice and crowds out the subject — the image generator then paints a generic pretty picture instead of this exact moment.
- So: no "hand-drawn", no "watercolour", no "ink", no colour names, no "textured rice paper", no "soft washes", no palette, no style-name. Just what is in the picture.

DESCRIBE THIS SEGMENT'S EXACT MOMENT:
- The image must show what the narration of THIS segment is talking about right now.
- One dense paragraph of concrete visual nouns: who is in frame, what they are doing, their posture and where they are looking, what objects are near them, the place, the time of day, the weather.
- Say where things sit in the picture (foreground / mid-ground / behind them, left or right, close-up or wide). Vary it across the episode — a run of identical wide shots is dull, and so is a run of close-ups.
- When the narration turns inward and has no action to show, pick ONE physical object from the scene and hold on it in daylight. Never fall back on a generic postcard.

EVERY SCENE IS JAPANESE — NAME IT, NEVER ASSUME IT:
- The image generator knows nothing about this episode except the one sentence you hand it. Given "a scholar reading heavy books by a window" it paints a European scholar with gold-tooled leather books at a French casement window. That has already happened on this pipeline, and it is its single most common failure: the pictures come back with nothing Japanese in them at all.
- So OPEN every visualDescription by placing the scene: ${worldOpeners}. One short clause, then the moment itself.
- Name every person as Japanese and say what they wear. ${peopleExamples} A figure described only as "a man", "a scholar" or "a woman in a robe" comes out Western every single time.
- Swap Western defaults for their Japanese counterpart, every time:
    heavy books, a library → stacks of thread-bound rice-paper volumes and rolled scrolls in wooden racks
    desk and chair → a low wooden writing table with a floor cushion or a tatami mat
    window → a wooden lattice window or a shoji paper screen open onto a garden
    room, study, house → a timber-post room with a tatami floor, sliding paper doors, deep tiled eaves outside
    pen, paper, writing → a bamboo brush, an ink stone, a sheet of unrolled paper
    cup, mug → a small clay tea bowl
    well → a low stone well with a wooden bucket on a rope
    hut, cottage → a small wooden hut with a thatched roof and deep eaves
    church, hall → a temple hall with a wooden statue and an incense burner
    garden, yard → a raked gravel rock garden, a lotus pond, a stone lantern under a pine

WRITE ONLY WHAT IS THERE — NEVER WHAT IS ABSENT:
- Your visualDescription is pasted straight into an image generator that takes one positive prompt and has no negative-prompt channel. Every noun you write gets drawn, even inside a phrase like "no ..." or "without ...". Writing "no people in frame" is a reliable way to get people in the frame.
- So never write "no", "without", "empty of", "free of", "instead of", "not a". Describe only what IS in the picture.
- Avoid the words "frame", "border", "edge of the frame", "fading out", "vignette" — they make the generator draw the picture as a small card sitting inside a border. Say "in the foreground", "on the left", "in the distance" instead.

LIGHT: EVERY SCENE IS DAYLIGHT.
- The illustration style is bright, airy watercolour on white paper. A night scene or a dark interior comes out muddy and grey in it, which is why this is a hard rule.
- Allowed: early morning, soft overcast noon, drizzle, mist burning off, late afternoon. Say which one.
- Never write "night", "darkness", "candlelit", "lit by an oil lamp", "glowing", "in shadow", or "silhouette". A lamp may sit in the scene as an unlit object, never as the light source.
- If the narration itself is set at night, illustrate the moment in the flattest, brightest reading the scene allows rather than a dark room.

${themeBlock}

${worldList}

NEVER: European or Western people, dress, architecture or objects of any kind — no leather-bound gold-spine books, no panelled casement windows, no upholstered chairs, no European stone cottages or churches. Never modern objects (cars, phones, electric light, modern clothing). Never text or letters or watermarks of any kind, never photorealism or 3D CGI gloss.
${compositionGuidance}`;
}

/**
 * Mục 8 — ảnh bìa: hai prompt HÌNH + ba dòng CHỮ sẽ được vẽ thẳng vào ảnh.
 *
 * Trước đây ảnh bìa cố tình không có chữ ("the text is added later outside this pipeline"), nhưng
 * với dòng video này không hề có bước "later" nào: người dùng lấy thẳng ảnh Google Flow làm
 * thumbnail. Một bức tranh đẹp mà không có chữ thì người lướt không biết tập nói về cái gì.
 *
 * Nên giờ Gemini phải viết luôn phần chữ, NGẮN và bằng tiếng Nhật. buildBuddhistCoverPrompts()
 * ghép nó thành câu chỉ dẫn "vẽ đúng mấy chữ này vào mảng giấy trắng đã chừa sẵn".
 */
export const SECTION_COVER = `────────────────────────────────────────
8. COVER ART — TWO PICTURES, PLUS THE JAPANESE TITLE PAINTED ONTO THEM
────────────────────────────────────────
Two separate thumbnail illustrations for the same episode, plus the short Japanese lettering that gets painted into them. Someone who sees only the thumbnail should already understand most of what this episode is about.

THE PICTURE — ENGLISH, SUBJECT ONLY. Same rules as visualDescription: no style words, no colour names, only what IS in the picture, daylight, old Japan. Do not describe letters or titles inside these two fields; the pipeline adds the lettering from the three fields below.
- "coverPrompts.landscape" — for the long 16:9 video. Pick the single strongest image of the whole episode (its peak, not its opening) and make it READ AT A GLANCE: the one thing this episode is about, shown plainly. Put the main figure or object clearly on the RIGHT side of the frame, and leave the LEFT THIRD open and quiet — bare ground, mist, empty sky — because the title is painted down that side.
- "coverPrompts.portrait" — for the 9:16 vertical short. Same episode, composed TALL and read at thumbnail size on a phone: one subject, close, centred, filling the middle, open ground below. Keep the UPPER QUARTER open and quiet — the title is painted across it. Simpler than the landscape one; a busy vertical thumbnail turns to mush when it is small.
- Do not simply repeat the visualDescription of segment 1. A cover is chosen for how it looks at a glance, not for where it sits in the story.

THE LETTERING — JAPANESE, SHORT, PAINTED INTO THE PICTURE:
- "coverPrompts.headline": the episode in 4 to 8 Japanese characters — a name, a place, an event. 「応仁の乱」「関ヶ原」「刀を置いた日」. This is painted large, so keep it SHORT: every extra character is one more chance the brush strokes come out wrong.
- "coverPrompts.sub": ONE line of 10 to 18 Japanese characters saying what actually happened, painted smaller beneath the headline. 「京の都が燃えた十年」. Headline plus sub together must tell a stranger most of the episode.
- "coverPrompts.kicker": the year and the place in 6 to 12 plain characters — 「一四六七年 京都」. Write numbers as kanji.
- All three are READ OFF THE SCREEN, never spoken. No audio tags, no closing punctuation, no ！ or ？, no 【】 brackets, no emoji, no romaji.`;

/**
 * Luật giữ JSON hợp lệ — mục 9.
 *
 * Thêm sau khi gặp lỗi thật: Gemini trả về JSON hỏng ở vị trí 44282 ("Expected ',' or '}' after
 * property value") trên một kịch bản 132 segment. Hai nguyên nhân đo được: model tự bịa thêm khoá
 * "vietnameseTranslation" lặp lại đúng nội dung đã có ở dòng 2 của "subtitle" (làm câu trả lời dài
 * gần gấp đôi, mà càng dài thì càng dễ rụng dấu phẩy), và nó chèn dấu " thẳng vào lời thoại Nhật.
 */
export const SECTION_JSON_RULES = `EXACT KEYS ONLY. Each segment object has EXACTLY these five keys and nothing else: "segmentNumber", "durationSeconds", "visualDescription", "dialogueOrNarration", "subtitle".
- Do NOT add a separate "vietnameseTranslation" key. The Vietnamese already lives on the second line of "subtitle", after the \\n. Repeating it doubles the size of an answer that is already 100+ segments long, and a longer answer is where commas start going missing.
- Quote Japanese speech with 「 」. Never put a " character inside a string value.
- After every property except the last one in its object, write a comma. After every segment except the last one, write a comma. A single missing comma makes the whole script unusable.`;

/** Hướng dẫn bố cục theo khung hình. */
export function compositionGuidanceFor(isLandscape) {
  return isLandscape
    ? `- FRAME FORMAT (16:9 landscape):
  - Compose each scene with traditional horizontal balance (rule of thirds, asymmetry).
  - Leave things open and uncluttered — bare white paper, morning mist, an open meadow or a flowing stream spreading across the width.
  - Keep the subject comfortably framed with painterly margins. No clutter.`
    : `- FRAME FORMAT (9:16 portrait):
  - Compose vertically: a towering pine, a figure climbing stone steps, tall grass rising into an open pale sky.
  - Center the focal point and leave wide breathing space above and below it.`;
}
