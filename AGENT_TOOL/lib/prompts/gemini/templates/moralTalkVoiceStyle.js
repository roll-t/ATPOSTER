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
import { isReflectiveMoralTheme } from '../../moralThemes.js';

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
5. Close by circling back to the opening image/question, landing on ONE short, quotable closing line — ideally imagined direct speech in quotation marks, the kind of line someone would screenshot and share.`;

    return { isReflectiveTheme, narrationModeLine, styleReferenceBlock };
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
1. Open with ONE short, blunt hook line that frames the whole list as hard-won truths learned through real-life experience, not textbook advice — and states the exact count of points, leading with the number itself, e.g. "10 quy tắc ngầm trong xã hội mà ai cũng nên biết." This line must also satisfy the 3-SECOND HOOK rules given above: at most ~14 words, no warm-up clause in front of the number. NEVER start this line with "Có" (e.g. NOT "Có 10 quy tắc..." — start straight with the number instead). That number MUST equal exactly how many list-point slides/lines follow, so the viewer knows upfront how long the list is and can follow along.
2. Each list point states the rule/fact DIRECTLY and PLAINLY, as its own complete statement — this is the DEFAULT for every point, straight to the point, no framing, no hedging. DO NOT force an artificial "[điều đúng], không phải [điều người ta thường lầm tưởng]" contrast onto every single point — repeated point after point across 5-10 points, that template becomes wordy and roundabout ("vòng vo") instead of sounding decisive. A contrast structure (e.g. "X, không phải Y" or "X thay vì Y") is fine ONLY where the content itself genuinely calls for correcting a common misconception — most points should just state the rule outright with zero contrast framing, exactly like "Hai. Có mượn thì phải trả." or "Năm. Được mời đi tiệc thì mang theo quà." in the reference sample.
3. Lead each point with a plain sequential counting word FOLLOWED BY A PERIOD (not a comma, not the word "là") — "Một. Hai. Ba. Bốn. Năm. Sáu...." (NOT "Một, Hai," and NOT "Một là, Hai là...") — or in English mode: "First. Second. Third. Fourth...." The period after the number is a deliberate full stop, giving the voice a clear beat/pause before each point begins.
4. Keep each point SHORT — usually just ONE sentence (occasionally two short clauses joined by a comma when the rule naturally has two related parts, like point Bốn/Chín in the sample). Do not pad with an extra justification/explanation sentence after the rule — state it and move on. Real hard-won-wisdom lists don't explain themselves; explaining every point is exactly the "lòng vòng" (roundabout) feeling to avoid.
5. Optionally close with ONE short, punchy line that invites the viewer to self-check against the list, e.g. "Bạn biết được bao nhiêu điều trong số này?" — this works well as a scroll-stopping, comment-bait closer for this genre.
6. Tone across the whole list: direct, confident, unsentimental, slightly blunt — never preachy, never flowery. This is the opposite register from a warm bedtime-story voice.`;

  return { isReflectiveTheme, narrationModeLine, styleReferenceBlock };
}
