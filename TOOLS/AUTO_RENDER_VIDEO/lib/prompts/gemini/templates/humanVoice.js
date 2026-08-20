/**
 * Hai khối hướng dẫn DÙNG CHUNG cho mọi nơi sinh lời kể, giải quyết 2 điểm yếu mà bản prompt cũ
 * hoàn toàn bỏ trống:
 *
 *  1. HOOK 3 GIÂY ĐẦU — người xem lướt short quyết định ở/đi trong khoảng 3 giây. Prompt cũ chỉ
 *     nói chung chung "mở bằng câu hỏi tu từ" mà không ràng buộc ĐỘ DÀI hay TIÊU CHUẨN, nên Gemini
 *     hay mở bằng câu dẫn nhập trừu tượng dài lê thê ("Trong cuộc sống hiện đại ngày nay...") —
 *     hết 3 giây vàng mà người nghe vẫn chưa biết video nói về cái gì.
 *
 *     BỔ SUNG (TOPIC LOCK): chỉ ràng buộc độ dài + cấm sáo ngữ VẪN CHƯA ĐỦ. Thực tế Gemini viết ra
 *     câu mở đúng 14 chữ, đúng "có tension", nhưng KHÔNG hề nhắc tới chủ đề — kiểu "Có những gánh
 *     nặng không ai nhìn thấy." cho chủ đề "áp lực của đàn ông" — rồi mới vào đề ở câu 2-3. Người
 *     dùng phải tự viết thêm câu dặn "vào đề ngay từ câu đầu, đừng mở bài" vào ô chủ đề thì kịch
 *     bản mới đúng. Nên buộc thẳng: từ khoá lõi của chủ đề PHẢI nằm trong câu đầu tiên, kèm phép
 *     thử "đổi chủ đề khác mà câu vẫn dùng được thì là câu sáo, viết lại".
 *
 *     BỔ SUNG (PAYOFF CLOCK): hook đạt rồi VẪN mất người xem. Vì cả khối này chỉ ràng buộc đúng
 *     CÂU ĐẦU TIÊN — từ câu 2 trở đi model được thả tự do, nên kịch bản thực tế đi: hook sắc gọn
 *     -> 3-4 slide dạo đầu trữ tình -> mãi tới gần giữa video mới có ý chính. Người dùng mô tả
 *     đúng triệu chứng: "hơi liên miên, rồi mới vào vấn đề cần nghe". Nên phải ràng buộc thêm
 *     TRỤC THỜI GIAN: chậm nhất tới segment 3 là phải có nội dung thật, mỗi segment một ý mới, và
 *     cấm đích danh khuôn dạo đầu hoài niệm đặt trước ý chính.
 *
 *  3. CHỐNG VĂN AI / DỊCH MÁY — đây là lỗ hổng lớn nhất. Không có bất kỳ ràng buộc nào, nên Gemini
 *     mặc định viết tiếng Việt theo đúng khuôn văn nghị luận dịch từ tiếng Anh: danh từ hoá ("sự
 *     thành công", "việc rèn luyện"), liên từ văn viết ("Tuy nhiên", "Bên cạnh đó"), sáo ngữ
 *     ("hành trình", "chìa khoá"), và toàn khái niệm trừu tượng không có chi tiết cụ thể nào.
 *     Người Việt nghe ra ngay là "văn máy" dù không chỉ được đích danh sai ở đâu.
 *
 * Cách viết 2 khối này theo hướng CẤM CỤ THỂ + VÍ DỤ SAI/ĐÚNG đặt cạnh nhau, thay vì khen chung
 * chung kiểu "hãy viết tự nhiên" — model tuân thủ danh sách cấm đích danh tốt hơn nhiều so với
 * tính từ mô tả mơ hồ.
 */

/**
 * Ràng buộc cho CÂU ĐẦU TIÊN của toàn bộ kịch bản (slide 1).
 *
 * `topic` là chủ đề người dùng nhập (input.scenario) — truyền vào để trích từ khoá lõi và ép nó
 * xuất hiện ngay câu đầu. Vẫn để optional: chủ đề luôn được nhắc lại ở phần dưới của prompt, nên
 * khi không truyền thì chỉ mất phần trích dẫn tại chỗ, luật TOPIC LOCK vẫn còn hiệu lực.
 *
 * @param {{ isVietnamese?: boolean, topic?: string }} [opts]
 */
export function buildHookGuidance({ isVietnamese = true, topic = '' } = {}) {
  // Chủ đề người dùng nhập có thể dài cả đoạn (họ hay viết kèm luôn lời dặn) và có xuống dòng —
  // gấp về 1 dòng, cắt ngắn để không nuốt mất phần luật phía sau trong ngữ cảnh của model.
  const topicClean = String(topic || '').replace(/\s+/g, ' ').trim().slice(0, 200);

  const topicLockLine = topicClean
    ? `- THIS VIDEO'S TOPIC (as the user wrote it): "${topicClean}"
  Extract its 2 to 4 CORE KEYWORDS ${isVietnamese
    ? 'và bắt buộc chúng phải nằm TRONG câu đầu tiên (ví dụ chủ đề "Áp lực của đàn ông" -> từ khoá lõi "áp lực", "đàn ông" -> câu đầu phải chứa cả hai)'
    : 'and they MUST appear INSIDE the first sentence (e.g. topic "The pressure men live under" -> core keywords "pressure", "men" -> the first sentence must carry both)'} — the exact words, or an everyday equivalent so obvious that nobody could mistake the subject.`
    : `- Extract the 2 to 4 CORE KEYWORDS from the user's topic given further down in this prompt, and make sure they appear INSIDE the first sentence — the exact words, or an everyday equivalent so obvious that nobody could mistake the subject.`;

  const swapTestExample = isVietnamese
    ? `SAI (14 chữ, nghe có vẻ hay, nhưng hết 3 giây rồi vẫn chưa biết đang nói về ai): "Có những gánh nặng không ai nhìn thấy, và cũng chẳng ai hỏi tới."
  ĐÚNG (từ khoá nằm ngay 3 chữ đầu): "Đàn ông không được phép mệt — đó là luật ngầm không ai viết ra."`
    : `BAD (14 words, sounds nice, but 3 seconds are gone and the viewer still doesn't know the subject): "There are burdens nobody sees, and nobody ever asks about."
  GOOD (keywords land in the first 3 words): "Men aren't allowed to be tired — that's the rule nobody wrote down."`;

  const topicLockBlock = `TOPIC LOCK — NAME THE SUBJECT IN THE FIRST SENTENCE (read this before anything else; this is the #1 failure of this genre):
- The FIRST sentence must already say WHAT THIS VIDEO IS ABOUT. Someone who hears ONLY that one sentence, and nothing after it, must be able to state the topic out loud.
${topicLockLine}
- Put those keywords as EARLY in the sentence as the grammar allows — ideally within the first 5 to 7 words, not trailing at the end.
- ZERO WARM-UP, ZERO RAMP-UP: no scene-setting, no general observation about life/society/people, no greeting, no "context sentence" to set up the topic. The script starts ON the subject — first sentence, first words. ${isVietnamese ? 'Người xem chỉ cho bạn khoảng 1 giây để biết video này nói về cái gì; nói vòng vo 2-3 giây là họ lướt qua rồi.' : 'The viewer gives you about one second to learn what this video is about; ramble for 2-3 seconds and they have already swiped away.'}
- If the topic's keywords only show up in your sentence 2 or 3, DELETE every sentence before that one and START there. That deleted warm-up is exactly what makes people swipe away — it is never "necessary setup".
- SWAP TEST (mandatory): read your first sentence while imagining a completely different topic behind it. If it still fits, it is generic filler — rewrite it until the sentence can only belong to THIS topic.
  ${swapTestExample}
- Whatever hook shape you pick below, it must satisfy this topic lock — a hook that is punchy but subject-less has failed.
- Segment 1's narration must BEGIN with this sentence. Nothing may precede it: no title line, no greeting, no framing clause.`;


  const banned = isVietnamese
    ? `"Trong cuộc sống hiện đại ngày nay...", "Trong xã hội ngày nay...", "Ai trong chúng ta cũng từng...", "Có thể bạn chưa biết...", "Hôm nay chúng ta sẽ cùng tìm hiểu...", "Hãy cùng nhau khám phá...", "Cuộc sống là một hành trình...", "Xin chào các bạn..."`
    : `"In today's modern world...", "We all know that...", "Have you ever wondered...", "In this video, we'll explore...", "Life is a journey...", "Hello everyone..."`;

  // Thư viện kiểu hook, thay cho danh sách 4 mẫu cũ. Bốn kiểu đầu xếp lên trên vì trong các bài đo
  // retention 2026 chỉ còn 4 khuôn này giữ điểm cao (Identity Call, Contrarian Strike, Open Loop,
  // Confession); 6 kiểu sau là biến thể hợp với dòng "nói chuyện đạo lý" tiếng Việt.
  //
  // Mỗi mẫu bắt buộc kèm CHỦ ĐỀ tương ứng: bản 4-mẫu cũ chỉ đưa câu ví dụ trần, nên model học được
  // "câu hay" mà không học được điều quan trọng hơn — từ khoá chủ đề phải nằm ngay trong câu đó.
  const hookPatternLibrary = isVietnamese
    ? `   1. GỌI ĐÚNG TÊN NGƯỜI NGHE — chỉ thẳng video này nói về ai, để đúng người dừng lại.
      Chủ đề "người luôn nhắn tin trước": "Nếu bạn luôn là đứa nhắn tin trước, video này nói về bạn."
   2. ĐẬP LẠI ĐIỀU AI CŨNG TIN — nêu niềm tin phổ biến rồi bác thẳng, não người nghe không bỏ dở một mâu thuẫn.
      Chủ đề "làm hài lòng người khác": "Người càng cố làm hài lòng tất cả, càng bị coi thường."
   3. MỞ MỘT VÒNG CHƯA ĐÓNG — hé ra một thứ chưa nói hết, phải nghe tiếp mới biết.
      Chủ đề "cha mẹ già đi": "Mẹ tôi nói một câu năm 60 tuổi, tôi im lặng cả buổi tối."
   4. TỰ THÚ MỘT MẤT MÁT CỤ THỂ — kể cái giá chính mình đã trả, có con số hoặc mốc thời gian.
      Chủ đề "nghề tay trái": "Tôi mất 8 tháng và 30 triệu mới hiểu mình bán sai thứ."
   5. CHẠM ĐÚNG NỖI ĐAU CỤ THỂ — tả đúng một cảnh người nghe vừa trải qua tuần này.
      Chủ đề "áp lực công việc": "Bạn trả lời tin nhắn sếp lúc 11 giờ đêm, mà vẫn thấy mình chưa đủ."
   6. CON SỐ + LỜI HỨA — dùng khi chủ đề đếm được số ý (xem luật MỞ BÀI HAI NHỊP bên dưới).
      Chủ đề "quy tắc ngầm trong xã hội": "10 quy tắc ngầm trong xã hội mà ai cũng nên biết."
   7. CÂU HỎI SOI CHIẾU — câu hỏi NGẮN buộc người nghe tự trả lời trong đầu.
      Chủ đề "sống cho bản thân": "Lần cuối bạn làm gì đó chỉ vì bản thân thích là khi nào?"
   8. CÁI GIÁ CỦA VIỆC KHÔNG BIẾT — nói thẳng người nghe mất gì nếu lướt qua.
      Chủ đề "ứng xử với sếp": "Có một câu đừng bao giờ nói với sếp. Nhiều người mất thăng chức vì nó."
   9. ĐỨNG VỀ PHÍA NGƯỜI NGHE — gỡ tội cho họ trước, rồi mới nói lý do.
      Chủ đề "sống chậm": "Bạn không lười. Bạn chỉ đang chạy quá lâu mà chưa được dừng."
   10. MỘT CÂU THOẠI CÓ THẬT — mở bằng lời ai đó đã nói, đặt trong ngoặc kép.
      Chủ đề "cô đơn": "'Sao dạo này mày ít nhắn tin thế?' — câu đó tôi không trả lời được."
   CÁCH CHỌN: chọn ĐÚNG MỘT kiểu hợp với chủ đề. Đừng ghép 2 kiểu vào một câu — hook ghép là hook loãng. Chủ đề có đếm số ý thì kiểu 6 là bắt buộc.
   ĐỪNG chép nguyên văn các ví dụ trên — chúng là KHUÔN để dựng câu mới, không phải câu để dùng lại.
   Để ý điểm chung: cả 10 mẫu đều có từ khoá của chủ đề NGAY trong câu đầu. Không mẫu nào bắt người nghe chờ tới câu thứ hai mới biết đang nói về cái gì — đó là điều kiện, không phải tuỳ chọn.`
    : `   1. IDENTITY CALL — name exactly who this is for, so the right person stops scrolling.
      Topic "people who always text first": "If you're always the one who texts first, this is about you."
   2. CONTRARIAN STRIKE — state the common belief, then reject it. The brain can't leave a contradiction unresolved.
      Topic "people-pleasing": "The harder you try to please everyone, the less they respect you."
   3. OPEN LOOP — reveal part of something and withhold the rest; they must stay to close it.
      Topic "ageing parents": "My mother said one sentence at 60, and I went quiet all evening."
   4. CONFESSION — name the price you personally paid, with a number or a date.
      Topic "side hustle": "It took me 8 months and $1,200 to learn I was selling the wrong thing."
   5. CONCRETE PAIN POINT — describe a scene the listener lived through this week.
      Topic "work pressure": "You answer your boss at 11 p.m., and still feel like you're not doing enough."
   6. NUMBER PLUS PROMISE — use when the topic enumerates points (see the TWO-BEAT OPENING rule below).
      Topic "unspoken social rules": "10 unspoken social rules everyone should know."
   7. MIRROR QUESTION — a SHORT question that forces an answer in the listener's head.
      Topic "living for yourself": "When was the last time you did something just because you wanted to?"
   8. COST OF NOT KNOWING — say plainly what they lose by scrolling past.
      Topic "talking to your boss": "There's one sentence you should never say to your boss. It costs people promotions."
   9. TAKE THEIR SIDE FIRST — absolve them, then explain why.
      Topic "slow living": "You're not lazy. You've just been running too long without being allowed to stop."
   10. A REAL QUOTED LINE — open on something somebody actually said, in quotation marks.
      Topic "loneliness": "'Why don't you text anymore?' — I had no answer for that."
   HOW TO CHOOSE: pick EXACTLY ONE shape that genuinely fits. Never fuse two into one sentence — a blended hook is a diluted hook. If the topic enumerates points, shape 6 is mandatory.
   Do NOT copy these examples verbatim — they are TEMPLATES for building a new line, not lines to reuse.
   Note what they share: all ten carry the topic's own keywords inside the very first sentence. None make the viewer wait until sentence two to find out what this is about — that is a condition, not an option.`;

  // Luật chống "vòng vo" — điểm hỏng thứ hai của dòng này, và là điểm mất người xem ĐÃ ở lại sau
  // hook. Trước đây toàn bộ prompt chỉ ràng buộc CÂU ĐẦU TIÊN: từ câu 2 trở đi model được thả tự
  // do, nên kịch bản hay đi hook (đạt) -> 3-4 slide dạo đầu trữ tình -> mãi mới tới ý chính. Với
  // nhóm chủ đề phản tư thì còn nặng hơn, vì chính đoạn văn mẫu trong moralTalkVoiceStyle.js có
  // sẵn nhịp dạo đầu đó và model bắt chước cấu trúc của mẫu.
  const payoffClockBlock = `PAYOFF CLOCK — THE FIRST 10 SECONDS (the #2 failure of this genre; this is what loses the viewers who ALREADY stayed for the hook):
- A strong hook followed by 20 seconds of warm-up still loses the viewer. Stopping the scroll and EARNING THE NEXT 30 SECONDS are two separate jobs, and only the first one is handled above.
- Segment 1 = the hook. Segment 2 = ONE line giving a reason to keep watching. From SEGMENT 3 ONWARD the script must already be delivering the real substance — the first actual point, rule, or insight the viewer came for. Segment 3 is a ceiling, not a target.
- HARD CAP ON SETUP: at most ONE segment of context/background in the whole opening. If two consecutive early segments only set a scene, describe how life generally is, or muse without asserting anything, DELETE ONE of them.
- RESULT FIRST: when the topic has an answer, a rule, or a conclusion, SAY IT EARLY and spend the rest of the video proving and unpacking it. Do not hold it back for a reveal at the end — short-form viewers do not wait for a payoff, they leave and the payoff is never seen.
- BANNED STRUCTURAL RAMP: ${isVietnamese
    ? 'kiểu dạo đầu hoài niệm — "Ngày bé, chúng ta từng...", "Khi còn nhỏ, ai cũng mơ...", "Cuộc sống rồi sẽ dạy chúng ta..." — đặt TRƯỚC ý chính đầu tiên. Khuôn này chỉ được dùng SAU khi đã vào nội dung, để minh hoạ cho một ý vừa nói, tuyệt đối không dùng làm đường dẫn vào bài.'
    : 'the nostalgic wind-up — "When we were young, we all dreamed...", "Life eventually teaches us..." — placed BEFORE the first real point. This shape is allowed only AFTER the substance has started, as illustration for a point already made, never as the on-ramp.'}
- DELETE TEST (apply to every segment before segment 5): if a segment can be removed and the viewer loses no information, no new idea, and no new image, then REMOVE it. ${isVietnamese
    ? 'Câu văn đẹp mà không mang thông tin mới chính là định nghĩa của "vòng vo".'
    : 'Beautiful sentences carrying no new information are the precise definition of rambling.'}
- ONE NEW IDEA PER SEGMENT from segment 3 onward. Restating the previous segment in prettier words is not a new segment — it is padding, and it reads as padding.`;

  return `OPENING — THE FIRST 3 SECONDS (HOOK) AND THE FIRST 10 (PAYOFF). CRITICAL: THIS DECIDES WHETHER ANYONE WATCHES.

${topicLockBlock}

- Short-form viewers decide within ~3 seconds whether to keep watching. The FIRST sentence of segment 1 is the single most important line in the entire script — write it last, after you know the payoff, then put it first.
- HARD LIMIT: that first sentence must be at most ~14 words (${isVietnamese ? 'tiếng Việt: tối đa khoảng 14 chữ' : 'about 3 seconds when spoken aloud'}). If it does not fit, it is not a hook — rewrite it shorter.
- It must land the CORE TENSION of the topic immediately. After hearing only that one sentence, the viewer should already know what this video is about and feel a reason to stay.
- HOOK PATTERN LIBRARY — pick ONE shape that genuinely fits this topic (these are the openings currently holding attention on TikTok/Reels; the first four are the ones that still score highest on 3-second retention):
${hookPatternLibrary}
- BANNED OPENINGS — never begin with any of these, or anything resembling them: ${banned}
  These are throat-clearing: they burn the 3 golden seconds on setup and say nothing. Delete the warm-up and start at the sentence that actually has tension in it.
- The first sentence must contain at least one CONCRETE noun, number, or image — never open on a pure abstraction. ${isVietnamese ? 'SAI: "Sự trưởng thành là một quá trình đầy thử thách." ĐÚNG: "Năm 25 tuổi, tôi nhận ra không ai đến cứu mình cả."' : 'BAD: "Growth is a challenging process." GOOD: "At 25, I realised nobody was coming to save me."'}
- Do NOT greet the audience, introduce yourself, name the channel, or explain what the video will cover. Start mid-tension, as if the conversation is already underway.

${payoffClockBlock}`;
}

/**
 * Ràng buộc giọng văn để lời kể nghe như NGƯỜI viết, không phải máy dịch.
 * @param {{ isVietnamese?: boolean }} [opts]
 */
export function buildHumanVoiceGuidance({ isVietnamese = true } = {}) {
  if (!isVietnamese) {
    return `SOUND HUMAN, NOT AI-GENERATED (IMPORTANT):
- Write the way a real person TALKS, not the way an essay is written. This is spoken narration — it will be read aloud, not read on a page.
- BANNED CONNECTORS (dead giveaways of AI writing): "However", "Moreover", "Furthermore", "In addition", "Therefore", "Thus", "In conclusion", "It is important to note that", "Not only... but also". Real speech uses "But", "And", "So", "Still", or simply starts a new sentence.
- BANNED CLICHÉS: "journey", "unlock your potential", "the key to success", "in today's fast-paced world", "at the end of the day", "game-changer", "the power of", "little did they know".
- Kill nominalisations: write "we failed", not "the occurrence of failure"; "she decided", not "the decision-making process".
- CONCRETE OVER ABSTRACT — this is the single biggest tell. Every abstract claim must be anchored by something the listener can picture: a time, an object, a number, a physical action. BAD: "He faced many difficulties." GOOD: "He rewrote that email nine times and still didn't send it."
- Vary rhythm deliberately. Three sentences of the same length in a row sounds robotic. Put a very short sentence (2-4 words) right after a long one — that contrast is what makes speech feel alive.
- Contractions are mandatory in spoken narration: "don't", "you're", "it's", "that's". Writing them out in full sounds stilted.
- Never explain the emotion you want the listener to feel ("This is truly heartbreaking"). Show the detail and let them feel it themselves.`;
  }

  return `VIẾT SAO CHO NGHE NHƯ NGƯỜI VIỆT NÓI, KHÔNG PHẢI VĂN MÁY DỊCH (CỰC KỲ QUAN TRỌNG):
Đây là lời NÓI để đọc thành tiếng, không phải bài văn nghị luận để đọc bằng mắt. Người Việt nghe ra "văn AI" ngay lập tức, và đây chính xác là những dấu hiệu tố cáo:

1. CẤM các liên từ văn viết — dấu hiệu số một của văn dịch máy:
   CẤM: "Tuy nhiên", "Bên cạnh đó", "Hơn nữa", "Ngoài ra", "Do đó", "Chính vì vậy", "Không những... mà còn", "Đầu tiên... Tiếp theo... Cuối cùng", "Nhìn chung", "Tóm lại".
   THAY BẰNG: "Nhưng", "Rồi", "Thế mà", "Vậy nên", "Có điều" — hoặc bỏ hẳn liên từ, bắt đầu câu mới luôn. Khi nói chuyện thật, người ta hiếm khi dùng liên từ trang trọng.

2. HẠN CHẾ TỐI ĐA danh từ hoá bằng "sự / việc / quá trình / một cách" — đây là dấu vết rõ nhất của văn dịch từ tiếng Anh sang:
   Quy tắc kiểm tra: bỏ chữ "sự"/"việc" đi rồi đọc lại. Nếu câu VẪN xuôi tai -> bắt buộc phải bỏ. Nếu câu gãy -> được giữ.
   PHẢI SỬA (bỏ đi vẫn xuôi): "sự hiện diện của bạn" -> "bạn có mặt"; "sự hy sinh của bạn" -> "bạn hy sinh"; "việc rèn luyện bản thân" -> "tự rèn mình"; "quá trình trưởng thành" -> "lớn lên"; "một cách hiệu quả" -> "hiệu quả"; "sự nuông chiều nỗi sợ" -> "nuông chiều nỗi sợ".
   ĐƯỢC GIỮ (là danh từ cố định, bỏ đi thì gãy câu): "sự thật", "sự nghiệp", "sự thanh thản", "sự tử tế", "sự tự trọng".
   Mẹo mạnh nhất: khi định viết "sự X của bạn", hãy đổi thành câu có chủ ngữ — "bạn X". Người Việt nói bằng ĐỘNG TỪ, văn dịch máy nói bằng DANH TỪ. Cả đoạn nên có nhiều nhất 1-2 chữ "sự".

3. CẤM sáo ngữ động lực đã mòn: "hành trình", "chìa khoá thành công", "bí quyết", "vượt qua giới hạn bản thân", "phiên bản tốt hơn của chính mình", "sức mạnh của sự kiên trì", "điều kỳ diệu sẽ xảy ra", "hãy nhớ rằng...", "chúc bạn...".

4. CẤM kết bài kiểu giáo huấn: "Vì vậy, hãy...", "Hãy luôn nhớ rằng...", "Mong rằng bài học này...". Người nghe ghét bị dạy đời. Kết bằng một hình ảnh, một câu thoại, hoặc một câu hỏi để lửng — đừng chốt bằng lời khuyên.

5. CỤ THỂ THAY VÌ TRỪU TƯỢNG — đây là điểm khác biệt lớn nhất giữa văn người và văn máy:
   Mỗi ý trừu tượng phải có một chi tiết sờ được neo lại: một giờ giấc, một đồ vật, một con số, một hành động nhìn thấy được.
   SAI: "Cuộc sống mang đến nhiều khó khăn và thử thách cho chúng ta."
   ĐÚNG: "Bảy giờ sáng, bạn tắt chuông báo thức lần thứ tư, và biết hôm nay sẽ lại trễ."
   SAI: "Sự cô đơn là điều mà nhiều người phải đối mặt."
   ĐÚNG: "Điện thoại đầy danh bạ, mà không biết gọi cho ai lúc 2 giờ sáng."

6. DÙNG TỪ THUẦN VIỆT NGẮN, tránh từ Hán-Việt trừu tượng khi có từ thuần Việt tương đương:
   "khó khăn" -> "khổ", "vất vả"; "cố gắng nỗ lực" -> "ráng", "gắng"; "thấu hiểu" -> "hiểu"; "trân trọng" -> "quý"; "đối mặt với" -> "gặp", "chịu".

7. NHỊP CÂU PHẢI LỆCH NHAU. Ba câu dài bằng nhau liên tiếp là nghe ra máy viết ngay. Sau một câu dài, đặt một câu cực ngắn 2-4 chữ ("Vậy thôi.", "Rồi sao nữa?", "Không ai cả."). Chính chỗ gãy nhịp đó làm lời kể sống dậy.

8. ĐƯỢC PHÉP dùng tiểu từ tình thái cuối câu như khi nói thật — "thôi", "đấy", "mà", "chứ", "nhỉ", "cả" — nhưng rải thưa, mỗi đoạn 1-2 lần là đủ, nhiều quá thành nhại.

9. KHÔNG gọi tên cảm xúc muốn người nghe cảm thấy ("Thật đau lòng làm sao", "Điều này thật ý nghĩa"). Kể chi tiết ra rồi để người nghe tự thấy. Gọi tên cảm xúc hộ khán giả là cách nhanh nhất để mất họ.

10. Đọc to lại từng câu trước khi chốt. Nếu câu đó bạn sẽ KHÔNG bao giờ nói ra miệng khi ngồi nói chuyện với bạn bè, thì viết lại.

BƯỚC TỰ KIỂM TRA BẮT BUỘC (làm trong đầu trước khi xuất JSON, đừng ghi ra kết quả kiểm tra):
Sau khi viết xong toàn bộ lời kể, rà lại một lượt và ĐẾM:
   a. Còn liên từ nào trong danh sách cấm ở mục 1 không? -> Còn thì thay hết.
   b. Cả kịch bản có quá 2 chữ "sự"/"việc" đứng trước động từ hoặc tính từ không? -> Quá thì sửa theo mục 2.
   c. Có đoạn nào chỉ toàn khái niệm trừu tượng, không có lấy một chi tiết cụ thể (giờ giấc, đồ vật, con số, hành động nhìn thấy được) không? -> Có thì thêm chi tiết vào.
   d. Có 3 câu liên tiếp dài xấp xỉ nhau không? -> Có thì cắt ngắn một câu xuống còn 2-4 chữ.
   e. Câu đầu tiên của slide 1 có quá 14 chữ, hoặc có nằm trong danh sách mở bài bị cấm không? -> Có thì viết lại cho tới khi đạt.
   f. QUAN TRỌNG NHẤT — đọc riêng câu đầu tiên của slide 1, không đọc gì thêm: chỉ nghe câu đó thôi thì đã biết video nói về chủ đề gì chưa? Từ khoá lõi của chủ đề có nằm ngay trong câu đó không? -> Nếu chưa, tìm câu đầu tiên trong kịch bản có nhắc tới chủ đề, XOÁ HẾT các câu đứng trước nó, và bắt đầu từ đó.
   g. QUAN TRỌNG NGANG MỤC f — đọc slide 1, 2, 3 rồi dừng: tới đây người xem đã nhận được ý chính đầu tiên chưa, hay vẫn đang nghe dạo đầu? -> Nếu tới slide 3 vẫn chưa có nội dung thật, XOÁ bớt slide dạo đầu và kéo ý chính lên. Rồi soát tiếp: có slide nào xoá đi mà người xem không mất thông tin nào không? -> Có thì xoá.
Chỉ xuất JSON sau khi cả 7 mục trên đều đạt.`;
}
