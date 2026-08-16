/**
 * Giọng văn/kỹ thuật viết dùng chung cho CẢ 2 nơi sinh lời kể của "Video Nói Chuyện Đạo Lý":
 * buildMoralTalkSlideshowScriptPrompt (sinh kịch bản từ đầu) VÀ buildRegenerateNarrationPrompt
 * (viết lại riêng lời kể, giữ nguyên ảnh — nút "🔄 Viết lại lời kể (giữ ảnh)"). Tách riêng file
 * này để 2 nơi đó KHÔNG lệch pha nhau — trước đây buildRegenerateNarrationPrompt có 1 bản style
 * riêng, cũ hơn, không biết gì về moralTheme, nên bấm "Viết lại lời kể" trên 1 project top_lists
 * lại ra văn phong tự sự chung chung thay vì đúng khuôn liệt kê "Một, Hai, Ba..." — đã gộp lại
 * làm một để sửa dứt điểm.
 *
 * self_help/rules_of_life và top_lists là 2 THỂ LOẠI văn phong khác hẳn nhau trên thực tế (đã
 * được người dùng xác nhận qua 2 đoạn văn mẫu thật): self_help/rules_of_life là văn phản tư ấm
 * áp, địa chỉ trực tiếp "bạn/chúng ta", giàu ẩn dụ; top_lists là văn liệt kê "sự thật trải đời",
 * ngắn, thẳng, mỗi điểm là 1 câu tương phản "A, không phải B" dẫn bằng số thứ tự trần trụi
 * ("Một, Hai, Ba..." — KHÔNG kèm "là", KHÔNG lặp lại 1 cụm danh từ như "Nguyên tắc của...").
 */
import { isReflectiveMoralTheme, getMoralThemeVoice } from '../../moralThemes.js';

/**
 * Quy tắc MỞ BÀI HAI NHỊP, dùng chung cho cả 2 văn phong.
 *
 * Trước đây con số ("7 điều...") bị gộp thẳng vào câu hook, nên kịch bản đi từ câu mở chấn động
 * nhảy luôn sang "Thứ nhất" — người xem không kịp biết sắp nghe bao nhiêu ý, mất luôn cái cớ để
 * ngồi lại nghe hết. Tách làm 2 nhịp: hook gây sốc trước, rồi một câu riêng hứa số lượng, xong mới
 * vào ý thứ nhất.
 *
 * Đặt ở file dùng chung này (không nhét riêng vào moralTalkSlideshow.js) vì nút "Viết lại lời kể
 * (giữ ảnh)" đi qua buildRegenerateNarrationPrompt — chỉ sửa một bên là hai bên lệch pha ngay, đúng
 * cái bẫy mà docblock đầu file này đã cảnh báo.
 *
 * Cố ý KHÔNG quy định dùng "Một." hay "Thứ nhất" ở đây: mỗi văn phong đã có quy ước đánh số riêng
 * ở phần kỹ thuật bên trên, viết đè lại sẽ mâu thuẫn với chính nó.
 */
const ENUMERATED_OPENING_RULE = `
TWO-BEAT OPENING (MANDATORY whenever the script enumerates points — i.e. the topic promises a count such as "7 điều...", "5 cách...", "6 dấu hiệu...", "5 lý do...", or you are writing points led by a sequence word):
- BEAT 1 — THE COUNT, FIRST WORDS OF THE SCRIPT: the very first line MUST OPEN WITH THE NUMBER ITSELF. Vietnamese: "6 cách để hết trì hoãn mà không cần ép bản thân." / "5 lý do người giỏi vẫn mãi không được cất nhắc." English: "6 ways to stop procrastinating without forcing yourself."
- ABSOLUTELY NO lead-in before that number. Do not warm up with a rhetorical question, a scene, a greeting, or any framing sentence and only then reveal the count — the viewer decides whether to keep watching in the first second, and the number is the single strongest reason to stay. Reject openings like "Bạn có bao giờ thấy mình cứ trì hoãn mãi không? Sau đây là 6 cách..." and write "6 cách để hết trì hoãn..." instead. Also never start with "Có" ("Có 6 cách..." — start on the digit).
- The number in BEAT 1 MUST equal exactly how many numbered points actually follow.
- BEAT 2 — THE REASON TO STAY: immediately after, ONE short standalone line that makes the viewer sit through the whole list — the sharpest point teased, the cost of not knowing, or who this is for. Vietnamese examples: "Cách thứ tư gần như không ai nghĩ tới." / "Điều cuối cùng là điều khiến nhiều người trả giá đắt nhất." Do NOT repeat the count here; it was already said in BEAT 1.
- Never jump straight from BEAT 1 into the first point — BEAT 2 is what converts a viewer who now knows the length into one who wants the content.
- BEAT 2 is its own narration beat: when the output is split into slides/segments, it gets its own slide, separate from the opening slide and separate from point one.
- Number the points using whichever sequence-word convention this voice's techniques above specify — do not invent a different one here.`;

export function getMoralTalkStyleReference(theme) {
  // Văn phong đọc từ registry (moralThemes.js) chứ KHÔNG so sánh chuỗi tại đây nữa: trước đây là
  // `theme === 'self_help' || theme === 'rules_of_life'`, nên mọi nhóm chủ đề thêm về sau đều âm
  // thầm rơi xuống nhánh liệt kê, kể cả các nhóm tâm tình (love_boundaries, healing_pressure) —
  // không báo lỗi, chỉ là video xuất ra sai giọng.
  const isReflectiveTheme = isReflectiveMoralTheme(theme);

  if (isReflectiveTheme) {
    const reflectiveSample = `Nếu một ngày bạn gặp lại chính mình của lúc nhỏ, bạn nghĩ đứa trẻ ấy có thích con người hiện tại của bạn không? Nó sẽ nhìn bạn với ánh mắt đầy tự hào, hay sẽ lặng im vì nhận ra người lớn trước mặt đã đánh mất quá nhiều điều?

Ngày bé, chúng ta từng mơ sẽ trở thành một người thật tuyệt, một người sống tử tế, dũng cảm và hạnh phúc. Chúng ta từng tin rằng chỉ cần lớn lên là mọi thứ sẽ dễ dàng hơn. Nhưng rồi cuộc sống dạy chúng ta cách im lặng nhiều hơn cười, cách giấu nước mắt sau một nụ cười, và đôi khi phải từ bỏ những ước mơ từng xem là cả thế giới.

Thế nhưng, có một điều mà đứa trẻ năm ấy chắc chắn vẫn luôn mong ở bạn: đó không phải là bạn giàu đến đâu, không phải là bạn nổi tiếng thế nào, mà là sau tất cả những gì cuộc đời mang đến, bạn vẫn là một người tử tế, vẫn biết yêu thương, vẫn biết đứng dậy sau những lần vấp ngã, vẫn không đánh mất trái tim từng rất trong trẻo của mình.

Có lẽ trưởng thành không phải là trở thành một con người hoàn hảo, mà là sau bao nhiêu giông bão, bạn vẫn giữ được những điều đẹp nhất mà đứa trẻ ngày xưa từng có.

Vậy nên, nếu một ngày gặp lại chính mình của lúc nhỏ, hy vọng đứa trẻ ấy sẽ mỉm cười, nắm lấy tay bạn và nói: 'Cảm ơn vì cậu đã không từ bỏ ước mơ của chúng ta.'`;

    const narrationModeLine = `- Write DIRECTLY to the listener, using "bạn"/"chúng ta" throughout — like a close friend speaking quietly and personally to them, not a narrator describing a story about someone else. Reflective and heartfelt, never preachy or lecturing, never using the words "moral" or "lesson" explicitly if it can be shown/felt instead of said.`;

    const styleReferenceBlock = `VOICE & STYLE REFERENCE (IMPORTANT — study this sample closely and reproduce its TONE, RHETORICAL DEVICES, and SENTENCE RHYTHM; write about the user's own topic below, never reuse this sample's actual wording or its "meeting your childhood self" framing — that is only ONE example of the technique):
"""
${reflectiveSample}
"""
Techniques to reproduce from this reference, applied to whatever topic is given:
1. Open with a reflective, rhetorical QUESTION addressed directly to "bạn" that draws the listener into the emotional premise of the topic — never open with a plain flat statement. This opening question must also satisfy the 3-SECOND HOOK rules given above: at most ~14 words, containing a concrete image/number/detail, no warm-up clause before it. A long, abstract opening question is NOT a hook — e.g. reject "Bạn có bao giờ tự hỏi rằng liệu cuộc sống hiện tại của mình có thực sự là điều mình mong muốn hay không?" and write something like "Nếu gặp lại mình năm 10 tuổi, bạn có dám nhìn thẳng vào mắt nó không?" instead.
2. Use repetition / parallel sentence structure at least once (e.g. "Chúng ta từng... Chúng ta từng...", "vẫn... vẫn... vẫn...") to build rhythmic, almost lyrical momentum.
3. Use a clear BEFORE/AFTER or contrast structure — what we once believed, hoped for, or felt as a child/beginner, versus what life actually taught us or how things really turned out.
4. Use elevated, image-rich, literary spoken language (metaphor, emotionally specific word choices like "giấu nước mắt sau một nụ cười") while still sounding natural when read aloud — not stiff, not academic, not a list of vague generalities.
5. Close by circling back to the opening image/question, landing on ONE short, quotable closing line — ideally imagined direct speech in quotation marks, the kind of line someone would screenshot and share.
6. If (and only if) the topic promises a count of points, number them naturally in this warm register — "Thứ nhất, ... Thứ hai, ... Thứ ba, ..." — and keep each point's explanation in the same reflective, image-rich voice. A reflective topic that is NOT enumerative must stay a flowing piece with no numbering at all.
${ENUMERATED_OPENING_RULE}`;

    return { isReflectiveTheme, narrationModeLine, styleReferenceBlock };
  }

  if (getMoralThemeVoice(theme) === 'satire') {
    const narrationModeLine = `- Write as a witty, self-aware Gen Z Vietnamese creator riffing on ONE trending slang term — playful, teasing, a little dramatic, the tone of a friend roasting a familiar type of person over iced tea. Speak to "bạn" directly. Never preachy, never a dictionary entry read out loud.`;

    const styleReferenceBlock = `VOICE & STYLE — TRENDING SLANG SATIRE:

TERM LOCK (the anchor of this theme, tuned for a natural SPOKEN rhythm — a real script came out repeating the term as the subject of nearly every single sentence, which read stiff and keyword-stuffed rather than like someone actually talking; the fix below keeps the term as the anchor without forcing it into every line):
- The topic names a Vietnamese trending slang term (e.g. "Sĩ Vương", "Lốp Trưởng", "Lọ Vương"). That exact term is the SUBJECT and the running joke of the whole video, and it MUST appear — spelled, capitalised, exactly as given, never translated, never respelled — in the OPENING line (together with the count, see the two-beat opening rule below) and again in the CLOSING callback line. Those two anchors are non-negotiable: a viewer who only catches the first and last seconds must still clearly hear which trend this is.
- Inside the BODY (the numbered situations), do NOT force the exact term to be the subject of every single point — that is what read unnatural. Write the way a Vietnamese speaker actually talks about a recognisable type of person: drop the subject entirely wherever the sentence flows fine without it (Vietnamese naturally omits the subject in a follow-up clause — e.g. "Đi ăn lúc nào cũng tranh trả tiền... Nhưng cả tháng sau đó chỉ dám ăn mì tôm." needs no restated name in the second clause), or lean on a light connector/filler ("vậy mà", "ấy vậy", "kiểu", "thế mà") instead of restating the full term.
- As a natural rhythm (not a strict count), bring the exact term back once every 2 to 3 points — never in literally every single point — so a viewer landing mid-video still hears it from time to time, without every sentence starting with the same name.
- What NEVER changes: when you DO say the term, say it VERBATIM — same words, same spelling, same capitalisation. Never swap in a "proper" synonym or invent a different nickname FOR the term itself (e.g. if the term is "Lốp Trưởng", never write "người thích ra vẻ" or "anh chàng ấy" AS A STAND-IN for the term — that replaces the joke). The relaxation above is about how OFTEN the term is said, never about respelling or paraphrasing the term when it is said.
- Do not explain the term as a definition ("X là từ dùng để chỉ..."). Show it through situations the viewer recognises instead.

Techniques:
1. Open with the term in the FIRST few words — no build-up. e.g. "Lốp Trưởng — kiểu người ai trong nhóm bạn cũng gặp một lần."
2. Then a line that promises recognition: the viewer should think "ủa, quen quá". e.g. "Nghe xong bạn sẽ nghĩ ngay ra một đứa."
3. Body = a run of short, punchy SITUATIONS, not abstract traits. Each one is a tiny scene the viewer has actually lived through (đi ăn, đi nhậu, group chat, đi làm, deadline, chia tiền), ending on a punchline beat. Keep sentences short — this voice lives on rhythm and timing.
4. Exaggerate the situation, never the insult. Roast the BEHAVIOUR, and keep it recognisable-funny rather than cruel.
5. Sprinkle natural spoken Gen Z Vietnamese ("đỉnh nóc", "chốt đơn", "mất điện", "flex", "chill", "khum") ONLY where it lands naturally — forced slang in every sentence reads like an adult imitating teenagers, which kills the joke faster than no slang at all.
6. Close with a short callback that turns the term back on the viewer, in a friendly way. e.g. "Tag ngay đứa Lốp Trưởng trong nhóm đi."

HARD LIMITS:
- Satirise a TYPE of behaviour, never a real, named, identifiable person. No real names, no "con nhỏ lớp bên", no references that point at one specific human being.
- Nothing that mocks appearance, body, disability, ethnicity, region of origin, gender identity, sexual orientation, family circumstances or poverty. Those are not the joke — the behaviour is.
${ENUMERATED_OPENING_RULE}
- FOR THIS THEME ONLY, reconciling the two rules above: when the topic promises a count ("5 dấu hiệu bạn là Lốp Trưởng"), the opening line carries BOTH the number and the term together — "5 dấu hiệu bạn chính là Lốp Trưởng." When the topic has no count at all ("Lốp Trưởng là ai"), ignore the counting rule entirely and just open with the term.`;

    return { isReflectiveTheme: false, narrationModeLine, styleReferenceBlock };
  }

  const listSample = `10 quy tắc ngầm trong xã hội mà ai cũng nên biết.

Một. Đám cưới không mời thì không đến, đám tang biết chuyện thì phải đến.

Hai. Có mượn thì phải trả.

Ba. Kính rượu người lớn hơn thì cụng ly thấp hơn.

Bốn. Đi cùng sếp thì đi sau, chếch bên phải. Nếu đi ô tô thì mình ngồi ghế phụ, sếp ngồi ghế sau.

Năm. Được mời đi tiệc thì mang theo quà.

Sáu. Ăn uống không bới lộn xộn đĩa thức ăn, ăn miếng nào gắp miếng đấy.

Bảy. Muốn làm ăn phát thì phải biết kìm cái tôi, biết ơn người dẫn dắt mình.

Tám. Làm ăn kinh doanh thì đừng ngoại tình.

Chín. Đến sớm là đúng giờ, đến đúng giờ là trễ, đến trễ là không chấp nhận được.

Mười. Không được mời thì coi như không biết đến sự tồn tại của sự kiện đó, đừng hỏi tại sao không mời.

Bạn biết được bao nhiêu điều trong số này?`;

  const narrationModeLine = `- Write as a confident, matter-of-fact voice stating hard-won life/social rules — direct, blunt declarative statements, no soft warm-up, no apology, no over-explaining (using "bạn"/general "you" only where it fits naturally). Never use the words "moral" or "lesson" explicitly.`;

  const styleReferenceBlock = `VOICE & STYLE REFERENCE (IMPORTANT — study this sample closely and reproduce its STRUCTURE and TONE; write about the user's own topic below, never reuse this sample's actual points/wording — this is only an example of the technique):
"""
${listSample}
"""
Techniques to reproduce from this reference, applied to whatever topic is given:
1. Open with TWO separate beats (see the TWO-BEAT OPENING block below for the full rule). The FIRST line leads with the number itself and frames the list as hard-won truths learned through real life, not textbook advice — e.g. "10 quy tắc ngầm trong xã hội mà ai cũng nên biết." At most ~14 words, no warm-up clause in front of the number, and never starting with "Có". The count MUST equal exactly how many list-point slides/lines follow. The SECOND line is a short reason to stay to the end, without repeating the count.
2. Each list point states the rule/fact DIRECTLY and PLAINLY, as its own complete statement — this is the DEFAULT for every point, straight to the point, no framing, no hedging. DO NOT force an artificial "[điều đúng], không phải [điều người ta thường lầm tưởng]" contrast onto every single point — repeated point after point across 5-10 points, that template becomes wordy and roundabout ("vòng vo") instead of sounding decisive. A contrast structure (e.g. "X, không phải Y" or "X thay vì Y") is fine ONLY where the content itself genuinely calls for correcting a common misconception — most points should just state the rule outright with zero contrast framing, exactly like "Hai. Có mượn thì phải trả." or "Năm. Được mời đi tiệc thì mang theo quà." in the reference sample.
3. Lead each point with a plain sequential counting word FOLLOWED BY A PERIOD (not a comma, not the word "là") — "Một. Hai. Ba. Bốn. Năm. Sáu...." (NOT "Một, Hai," and NOT "Một là, Hai là...") — or in English mode: "First. Second. Third. Fourth...." The period after the number is a deliberate full stop, giving the voice a clear beat/pause before each point begins.
4. Keep each point SHORT — usually just ONE sentence (occasionally two short clauses joined by a comma when the rule naturally has two related parts, like point Bốn/Chín in the sample). Do not pad with an extra justification/explanation sentence after the rule — state it and move on. Real hard-won-wisdom lists don't explain themselves; explaining every point is exactly the "lòng vòng" (roundabout) feeling to avoid.
5. Optionally close with ONE short, punchy line that invites the viewer to self-check against the list, e.g. "Bạn biết được bao nhiêu điều trong số này?" — this works well as a scroll-stopping, comment-bait closer for this genre.
6. Tone across the whole list: direct, confident, unsentimental, slightly blunt — never preachy, never flowery. This is the opposite register from a warm bedtime-story voice.
${ENUMERATED_OPENING_RULE}`;

  return { isReflectiveTheme, narrationModeLine, styleReferenceBlock };
}
