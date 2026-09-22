/**
 * Kho prompt Suno để tự tạo NHẠC NỀN cho các kênh kể chuyện của tool.
 *
 * Vì sao cần kho riêng thay vì tự gõ mỗi lần: nhạc nền cho video có LỜI ĐỌC ĐÈ LÊN phải thoả những
 * ràng buộc mà nhạc nghe-riêng không cần, và chính mấy ràng buộc đó mới hay bị quên:
 *
 *   1. Âm lượng phải ĐỀU từ đầu tới cuối. App phát nhạc ở một mức cố định
 *      (DEFAULT_BG_MUSIC_VOLUME_PERCENT = 35%) và KHÔNG tự hạ xuống khi nhạc dâng lên. Một bản có
 *      cao trào nghĩa là đúng đoạn cao trào đó khán giả không nghe rõ lời kể nữa.
 *   2. Phải LẶP được. Video dài 8–20 phút, bản nhạc Suno chỉ vài phút, nên nó sẽ lặp nhiều lần.
 *      Bản nào kết thúc bằng fade out thì mỗi vòng lặp sẽ hụt một khoảng.
 *   3. Phải THƯA. Nhạc dày đặc ở dải giữa sẽ tranh chỗ với giọng người.
 *
 * Ba điều trên nằm trong các cụm bắt buộc ở PROMPT_CONSTRAINTS bên dưới — sửa prompt thì giữ lại.
 *
 * Ô "Exclude Styles" của Suno là lớp chặn thứ hai cho giọng hát: bật Instrumental vẫn thường xuyên
 * lọt tiếng ngâm nga, nên KHÔNG bỏ EXCLUDE_STYLES đi dù đã bật nút Instrumental.
 */

/** Dán vào ô "Exclude Styles" của Suno — dùng chung cho mọi bản. */
export const BG_MUSIC_EXCLUDE_STYLES =
  'vocals, humming, choir, chanting, spoken word, drum kit, trap drums, EDM, synth pop, orchestral hits, brass fanfare, cinematic riser, sudden crescendo, key change, sound effects, applause, fade out';

/** Cài đặt Suno cần đặt tay, hiển thị thành bảng trong tab. */
export const BG_MUSIC_SUNO_SETTINGS = [
  { label: 'Chế độ', value: 'Custom Mode', note: 'bật nút Instrumental' },
  { label: 'Model', value: 'v4.5 trở lên', note: 'ô Style nhận 1000 ký tự' },
  { label: 'Ô cần điền', value: 'Style', note: '+ Exclude Styles' },
  { label: 'Lời bài hát', value: 'Để trống', note: 'giọng đọc chính là phần lời' },
];

/** Những cụm từ không được bỏ khi tự sửa prompt, kèm lý do — hiển thị ngay trong tab. */
export const BG_MUSIC_CONSTRAINTS = [
  {
    phrase: 'constant dynamics, no build-ups',
    why: 'Giữ âm lượng đều. Bỏ ra là Suno dựng cao trào, mà app phát nhạc ở mức cố định 35% nên không tự hạ xuống được khi nhạc trào lên.',
  },
  {
    phrase: 'seamless loop',
    why: 'Video 8–20 phút nên nhạc lặp nhiều vòng. Cụm này giúp đoạn cuối không hụt khi nối lại vào đầu.',
  },
  {
    phrase: 'sparse arrangement',
    why: 'Nhạc thưa mới chừa chỗ dải giữa cho giọng người. Bản dày đặc nghe riêng thì hay nhưng đè lên lời kể.',
  },
  {
    phrase: 'mixed to sit under spoken narration',
    why: 'Nói thẳng cho Suno biết đây là nhạc nền, không phải bản nghe độc lập.',
  },
];

/**
 * 8 Thể loại nhạc nền chính trong tool, mỗi thể loại có các bản nhạc chuyên biệt khớp 100% chủ đề.
 */
export const MUSIC_PROMPT_CATEGORIES = [
  {
    id: 'news_journalism',
    icon: '📰',
    label: 'Bản Tin Thời Sự, Báo Chí & Phóng Sự',
    badge: 'THỜI SỰ & BÁO CHÍ',
    badgeBg: 'linear-gradient(135deg, #0284c7, #1e40af)',
    shortDescription: 'Nhịp ticker điện tử dồn dập, đàn dây ostinato trang trọng, âm bass hiện đại tạo không khí tin tức khẩn trương, chuyên nghiệp và chuẩn mực.',
    tags: ['Breaking News Ticker', 'Strings Ostinato', 'Nhịp Pulse Thời Sự', 'Báo Chí 116 BPM'],
    accentColor: '#38bdf8',
  },
  {
    id: 'zen_meditation',
    icon: '🪷',
    label: 'Thiền Định, Phật Giáo & Tĩnh Tâm',
    badge: 'THIỀN ĐỊNH & Y TĨNH',
    badgeBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    shortDescription: 'Sáo trúc Shakuhachi thanh tịnh, chuông xoay Tây Tạng ngân dài, 432Hz an định tâm trí và tiếng nước suối giúp tĩnh lặng tâm hồn.',
    tags: ['Sáo Shakuhachi', 'Chuông Xoay Tây Tạng', '432Hz Tĩnh Tâm', 'Nhạc Thiền'],
    accentColor: '#f59e0b',
  },
  {
    id: 'samurai_era',
    icon: '⚔️',
    label: 'Thời Đại Samurai & Bi Kịch Chiến Quốc',
    badge: 'LỊCH SỬ SAMURAI',
    badgeBg: 'linear-gradient(135deg, #ef4444, #991b1b)',
    shortDescription: 'Đàn tỳ bà Biwa gắt khô trang nghiêm, trống trận Taiko điểm nhịp định mệnh 62 BPM hào hùng và bi tráng.',
    tags: ['Tỳ Bà Satsuma Biwa', 'Trống Trận Taiko', 'Sử Thi Hào Hùng', 'Bản Nhạc 62 BPM'],
    accentColor: '#ef4444',
  },
  {
    id: 'ninja_shinobi',
    icon: '🥷',
    label: 'Ninja & Nghệ Thuật Ẩn Thân',
    badge: 'NINJA & SUSPENSE',
    badgeBg: 'linear-gradient(135deg, #8b5cf6, #4c1d95)',
    shortDescription: 'Sáo ngang Shinobue thưa thớt giữa đêm tĩnh mịch, nhịp rubato hồi hộp căng thẳng, nín thở rình rập kẻ địch.',
    tags: ['Sáo Shinobue', 'Nhịp Rubato Tự Do', 'Hồi Hộp & Căng Thẳng', 'Koto Ẩn Thoáng'],
    accentColor: '#8b5cf6',
  },
  {
    id: 'lofi_chill',
    icon: '☕',
    label: 'Lofi Chill Beats & Tập Trung Học Tập',
    badge: 'LOFI CHILL STUDY',
    badgeBg: 'linear-gradient(135deg, #f43f5e, #be123c)',
    shortDescription: 'Tiếng mưa rơi bên cửa sổ, hợp âm piano jazz ấm áp, đĩa than cổ điển cọt kẹt 70 BPM giúp tập trung cao độ.',
    tags: ['Vinyl Crackle', 'Mưa Rơi Bên Cửa Sổ', 'Jazz Piano Lofi', 'Deep Focus 70 BPM'],
    accentColor: '#f43f5e',
  },
  {
    id: 'ambient_sleep',
    icon: '🌙',
    label: 'Ambient Giấc Ngủ & Sóng Não 528Hz',
    badge: 'GIẤC NGỦ & AMBIENT',
    badgeBg: 'linear-gradient(135deg, #6366f1, #312e81)',
    shortDescription: 'Lớp pad không gian vô tận, tần số 528Hz chữa lành và sóng não Delta ru ngủ sâu không lời, không đổi nhịp đột ngột.',
    tags: ['Sóng Não Delta', 'Pad Không Gian Vô Tận', '528Hz Chữa Lành', 'Không Giật Nhịp'],
    accentColor: '#6366f1',
  },
  {
    id: 'ghibli_piano',
    icon: '🎹',
    label: 'Piano Thơ Mộng Phong Cách Ghibli',
    badge: 'GHIBLI NOSTALGIA',
    badgeBg: 'linear-gradient(135deg, #10b981, #065f46)',
    shortDescription: 'Giai điệu piano trong veo kết hợp dàn dây du dương, gợi cảm giác hoài niệm về mùa hè tuổi thơ Joe Hisaishi.',
    tags: ['Joe Hisaishi Style', 'Acoustic Grand Piano', 'Dàn Dây Ấm Áp', 'Hoài Niệm Tuổi Thơ'],
    accentColor: '#10b981',
  },
  {
    id: 'knowledge_curiosity',
    icon: '💡',
    label: 'Kiến Thức, Khoa Học & Khám Phá Thú Vị',
    badge: 'KIẾN THỨC & TÒ MÒ',
    badgeBg: 'linear-gradient(135deg, #06b6d4, #0284c7)',
    shortDescription: 'Tiếng đàn pizzicato gảy ngón ("ten ten ten"), đàn gõ marimba & chuông glockenspiel ("tin tin tin") vui tai, tò mò, bắt tai cho video kiến thức & mẹo vặt.',
    tags: ['Pizzicato Strings', 'Marimba Vui Nhộn', 'Chuông Glockenspiel', 'Tò Mò 108 BPM'],
    accentColor: '#06b6d4',
  },
];

/**
 * Danh sách toàn bộ các bản nhạc nền chi tiết, phân nhóm theo `themeKey` khớp 100% với MUSIC_PROMPT_CATEGORIES.
 */
export const BG_MUSIC_PROMPTS = [
  // ==========================================
  // 1. THỜI SỰ, BÁO CHÍ & PHÓNG SỰ (news_journalism)
  // ==========================================
  {
    id: 'breaking_news_broadcast',
    themeKey: 'news_journalism',
    label: 'Bản Tin Nóng & Breaking News Thời Sự',
    sublabel: 'Nhịp Ticker Khẩn Cấp, Đàn Dây Dồn Dập — 116 BPM',
    icon: '🚨',
    useCase:
      'Dành cho video bản tin thời sự hàng ngày, tin tức nóng, cập nhật khẩn cấp, tin giật gân (Breaking News) bằng TIẾNG VIỆT (kênh YouTube/TikTok/Reels phong cách VTV24, Chuyển Động 24h, Báo Thanh Niên, Tuổi Trẻ, VnExpress). Tiếng gõ ticker điện tử lách cách đều đặn, đàn dây violin ostinato lặp nhịp dứt khoát, âm bass synth trầm chắc khỏe. Giữ nhịp độ khẩn trương nhưng âm lượng đều đặn tuyệt đối, không có tiếng kèn chói tai, tôn trọn vẹn giọng đọc của biên tập viên.',
    prompt:
      'Breaking news broadcast underscore, modern journalistic television newsroom theme, authoritative and urgent, steady electronic news ticker pulse, rhythmic staccato string ostinato, warm deep analog bassline, crisp digital hi-hat tick, clean neutral synth pad background, 116 BPM, driving 4/4 meter, professional D minor and A minor key, broadcast mastering, pristine dry mix, sparse arrangement, constant dynamics, no brass fanfare, no sudden build-ups, seamless loop, mixed to sit under spoken news anchor narration and Vietnamese voiceover',
    instruments:
      'Digital ticker click gõ nhịp tin tức · Staccato strings ostinato lặp nhịp trang nghiêm · Bass synth trầm chắc định nhịp · Hoàn toàn không kèn brass chói tai · Âm lượng đều đặn dưới giọng đọc BTV.',
  },
  {
    id: 'investigative_journalism',
    themeKey: 'news_journalism',
    label: 'Phóng Sự Điều Tra & Hồ Sơ Phân Tích',
    sublabel: 'Căng Thẳng, Sắc Bén, Điềm Tĩnh — 100 BPM',
    icon: '🔍',
    useCase:
      'Dành cho video phóng sự tài liệu, hồ sơ điều tra vụ án, bóc trần sự thật, phân tích sự kiện chính trị - xã hội sâu sắc bằng TIẾNG VIỆT. Âm hưởng căng thẳng, điềm tĩnh, nghiêm nghị với tiếng đàn cello gảy ngắt quãng, synth pulse trầm ấm, tiếng piano tối giản rơi từng nốt đắt giá, tạo cảm giác người xem đang theo dõi một hồ sơ hệ trọng.',
    prompt:
      'Investigative journalism documentary underscore, serious and analytical, tension and gravitas, deep cinematic cello drone, muted rhythmic synth pulse, sparse lone acoustic piano single notes, subtle ticking clock percussion, dark atmospheric pad, 100 BPM, slow deliberate 4/4, serious cinematic minor key, wide room acoustic, very sparse arrangement, constant low dynamics, no loud riser, no sudden crescendo, seamless loop, mixed to sit under serious Vietnamese investigative narration',
    instruments:
      'Cello trầm sâu lắng · Muted synth pulse căng thẳng điềm tĩnh · Piano nốt đơn rơi có khoảng lặng · Tiếng tích tắc đồng hồ tinh tế · Rất thưa tiếng không tranh lời thuyết minh.',
  },
  {
    id: 'economy_tech_news',
    themeKey: 'news_journalism',
    label: 'Kinh Tế, Tài Chính & Công Nghệ Toàn Cầu',
    sublabel: 'Hiện Đại, Tự Tin, Góc Nhìn Chuyên Gia — 112 BPM',
    icon: '📈',
    useCase:
      'Dành cho video bản tin kinh tế, thị trường tài chính, chứng khoán, bất động sản, công nghệ AI và xu hướng toàn cầu bằng TIẾNG VIỆT. Nhịp điệu hiện đại, tự tin, mang hơi thở doanh nghiệp và số liệu sắc nét với tiếng guitar mộc gảy muted, electric piano Rhodes trong trẻo và nhịp kick điện tử mềm mại.',
    prompt:
      'Modern economic and financial news background music, corporate and technology broadcast, smart optimistic and professional, rhythmic muted acoustic guitar pluck, clean electric Rhodes piano chords, subtle warm synth bass groove, crisp soft digital percussion, 112 BPM, steady confident 4/4 rhythm, bright contemporary major-minor diatonic scale, polished clean broadcast mix, very sparse, constant dynamics, no volume drops, seamless loop, mixed to sit under Vietnamese financial news commentary',
    instruments:
      'Rhodes electric piano hiện đại · Muted acoustic guitar tỉa nhịp chuẩn xác · Soft digital drum mềm mại · Không khí kinh tế tài chính chuyên nghiệp, đáng tin cậy.',
  },

  // ==========================================
  // 2. THIỀN ĐỊNH, PHẬT GIÁO & TĨNH TÂM (zen_meditation)
  // ==========================================
  {
    id: 'zen_meditation',
    themeKey: 'zen_meditation',
    label: 'Sáo Trúc Shakuhachi & Chuông Xoay Tây Tạng',
    sublabel: 'Tĩnh Tâm Sâu, Gột Rửa Tâm Trí, An Định 432Hz — 48 BPM',
    icon: '🪷',
    useCase:
      'Dành cho video Phật pháp, bài giảng đạo lý, thiền định chánh niệm và gột rửa căng thẳng. Sáo trúc Shakuhachi thanh tịnh ngân nga tự do kết hợp chuông xoay Tây Tạng rung động sóng não và tiếng suối róc rách, giúp người nghe tĩnh tâm thẩm thấu trọn vẹn từng lời giảng.',
    prompt:
      'Zen meditation instrumental, deep spiritual stillness, tranquil bamboo forest ambience, slow resonant shakuhachi bamboo flute solo, distant singing bowl chime with long harmonic decay, soft trickle of mountain stream water, subtle warm drone, 48 BPM, free tempo rubato, Japanese in-scale pentatonic, expansive quiet monastery acoustic, very sparse arrangement, constant gentle dynamics, no crescendo, seamless loop, mixed to sit under spoken Buddhist narration',
    instruments:
      '尺八 Shakuhachi sáo trúc thanh tịnh · Chuông xoay Tây Tạng điểm xuyết ngân dài · Tiếng nước suối chảy êm đềm · Không gian thiền viện tĩnh mịch.',
  },
  {
    id: 'zen_monastery_water_stream',
    themeKey: 'zen_meditation',
    label: 'Thiền Viện Sương Mù & Vườn Đá Tĩnh Mịch',
    sublabel: 'Tiếng Chuông Chùa Xa, Suối Rừng & Đàn Koto Thoáng Hiện — 50 BPM',
    icon: '🔔',
    useCase:
      'Dành cho video kể chuyện triết lý nhân sinh, trà đạo, cuộc đời các bậc cao tăng, buông bỏ muộn phiền. Tiếng chuông chùa ngân xa trong sương sớm, đàn koto điểm nhẹ từng nốt thanh tao tạo cảm giác thanh thản vô biên.',
    prompt:
      'Peaceful Buddhist monastery underscore, misty mountain temple dawn, deep resonant temple bell strike with lingering ring, gentle Japanese koto plucked harmonics, airy bamboo flute whisper, subtle morning birdsong and quiet stream, 50 BPM, very slow unhurried pace, traditional pentatonic tranquility, spacious sacred hall reverb, ultra-minimal arrangement, constant soft dynamics, no sudden percussion, seamless loop, mixed to sit under calm storytelling voiceover',
    instruments:
      'Chuông đồng thiền viện ngân vang trầm ấm · Đàn Koto điểm nốt tinh khiết · Tiếng chim hót sớm & suối mát · Khoảng lặng an nhiên.',
  },
  {
    id: 'zen_mindful_breathing',
    themeKey: 'zen_meditation',
    label: 'Khúc Tĩnh Lặng Quán Chiếu & Hơi Thở Chánh Niệm',
    sublabel: 'Mõ Gỗ Nhẹ Nhàng, Không Khí Thanh Lương, An Trú Hiện Tại — 52 BPM',
    icon: '🕯️',
    useCase:
      'Dành cho video hướng dẫn thiền thở, tịnh tâm trước khi ngủ, trích dẫn lời Phật dạy. Tiếng mõ gỗ gõ đều đặn trầm ấm dẫn nhịp thở, lớp synth pad thiền định bồng bềnh nâng niu tâm trí.',
    prompt:
      'Mindfulness meditation background music, calm meditative breathing pace, rhythmic gentle wooden temple block percussion, warm ethereal drone pad, soft solitary shakuhachi breath notes, crystal singing bowl overtone, 52 BPM, slow steady contemplative rhythm, peaceful Asian contemplative scale, intimate natural warmth, very sparse, constant dynamics, zero build-up, seamless loop, mixed to sit under meditation guide and spiritual voice',
    instruments:
      'Mõ gỗ gõ nhịp thở an hòa · Pad ấm bồng bềnh che chở · Tiếng thở sáo trúc vi tế · Tối ưu trọn vẹn cho bài giảng pháp.',
  },

  // ==========================================
  // 3. THỜI ĐẠI SAMURAI & BI KỊCH CHIẾN QUỐC (samurai_era)
  // ==========================================
  {
    id: 'samurai_era',
    themeKey: 'samurai_era',
    label: 'Tỳ Bà Biwa & Khúc Ca Samurai Thầm Lặng',
    sublabel: 'Nghiêm Trang, Khắc Nghiệt, Tinh Thần Võ Sĩ Đạo Bushido — 54 BPM',
    icon: '⚔️',
    useCase:
      'Trầm, nghiêm, nhiều khoảng lặng giữa các nốt. Đàn tỳ bà Satsuma Biwa dẫn chính — đúng nhạc cụ các nghệ nhân mù xưa ngâm Bình Gia Khí Tượng, khắc họa khí chất võ sĩ đạo.',
    prompt:
      'Japanese traditional instrumental, restrained and grave, disciplined stillness, solo satsuma biwa plucked phrases with long silences between them, breathy low-register shakuhachi, muted koto, deep sustained strings, one soft taiko strike per phrase, 54 BPM, slow 4/4, minor pentatonic in-scale, close-mic biwa with wide room tail, very sparse, constant dynamics, no build-ups, seamless loop, mixed to sit under spoken narration',
    instruments:
      '薩摩琵琶 Satsuma Biwa tỳ bà võ sĩ gắt khô · Khoảng lặng dài giữa các câu để lời kể lọt vào · Cello drone giữ độ sâu.',
  },
  {
    id: 'japan_history',
    themeKey: 'samurai_era',
    label: 'Khúc Sử Ca Nhật Bản & Biến Cố Ngàn Năm',
    sublabel: 'Trang Nghiêm, Điềm Tĩnh, Cân Bằng Toàn Diện — 62 BPM',
    icon: '🏯',
    useCase:
      'Bản dùng chung, an toàn nhất cho chủ đề lịch sử. Trang nghiêm và điềm tĩnh, hợp mọi bài kể biến cố hoặc nhân vật lịch sử mà không nghiêng hẳn về trận mạc dữ dội.',
    prompt:
      'Japanese traditional instrumental, documentary underscore, dignified and certain, unhurried, shakuhachi bamboo flute lead, satsuma biwa plucked accents, low koto ostinato, sustained cello drone, distant taiko heartbeat, 62 BPM, slow 4/4, minor pentatonic in-scale, wide natural hall reverb, sparse arrangement, constant dynamics, no build-ups, seamless loop, mixed to sit under spoken narration',
    instruments:
      '尺八 Shakuhachi sáo trúc dẫn giai điệu · 琵琶 Biwa điểm nhịp · 箏 Koto giữ nền · 太鼓 Taiko trống xa như nhịp tim.',
  },
  {
    id: 'sengoku_events',
    themeKey: 'samurai_era',
    label: 'Trống Trận Taiko & Khí Thế Chiến Quốc Hào Hùng',
    sublabel: 'Hành Quân, Quyết Chiến & Vận Mệnh Bá Vương — 72 BPM',
    icon: '🔥',
    useCase:
      'Bản hào hùng nhất, khớp với các đại chiến như Sekigahara, Kawanakajima. Trống Taiko giữ nhịp định mệnh đều suốt bài — có sức nặng nhưng không bộc phát đột ngột để không nuốt mất lời kể.',
    prompt:
      'Japanese traditional instrumental, heroic and resolute, historical documentary weight, taiko ensemble low steady pulse held at one level, satsuma biwa martial plucked figures, shakuhachi lead over sustained low strings, war drum ostinato, 72 BPM, controlled driving 4/4, minor pentatonic in-scale, large hall reverb, strong low end, constant dynamics with no crescendo, seamless loop, mixed to sit under spoken narration',
    instruments:
      '和太鼓 Taiko giữ mạch hành quân vững vàng · Satsuma biwa đanh thép · Giữ nguyên một mức âm lượng (no crescendo).',
  },
  {
    id: 'tragic_history',
    themeKey: 'samurai_era',
    label: 'Bi Kịch Chiến Binh & Nỗi Đau Thành Bại',
    sublabel: 'Thê Lương, Hoài Niệm Bi Tráng, Tỳ Bà Lệ Rơi — 48 BPM',
    icon: '🥀',
    useCase:
      'Dành cho các câu chuyện về sự sụp đổ của gia tộc samurai, mổ bụng tự sát Seppuku, sự phản bội hoặc số phận bi đát của danh tướng. Sáo thê lương, tiếng tỳ bà buông nốt nặng nề.',
    prompt:
      'Japanese traditional instrumental, mournful and solemn, deep sorrow and heavy loss, elegiac documentary underscore, weeping solo shakuhachi flute, slow somber satsuma biwa plucked chords with long painful silences between phrases, sustained low cello drone, distant muffled taiko heartbeats, 48 BPM, very slow 4/4, melancholy minor pentatonic in-scale, dark natural hall reverb, sparse and weeping arrangement, constant low dynamics, no build-ups, seamless loop, mixed to sit under spoken narration',
    instruments:
      'Sáo Shakuhachi thê lương · Tỳ bà Biwa nốt gảy xót xa · Cello trầm sầu uất · Tiếng trống nghẹn ngào như nhịp tim.',
  },
  {
    id: 'heroes_legacy',
    themeKey: 'samurai_era',
    label: 'Di Sản Anh Hùng & Khúc Khải Hoàn Bất Diệt',
    sublabel: 'Trang Trọng, Ấm Áp, Tri Ân Bậc Vĩ Nhân — 66 BPM',
    icon: '🏆',
    useCase:
      'Ấm và sáng hơn, dùng thang ngũ cung yo (thang sáng của Nhật). Hợp với phân đoạn tổng kết công trạng, những cải cách để lại cho hậu thế của Oda Nobunaga hay Tokugawa Ieyasu.',
    prompt:
      'Japanese traditional instrumental, noble and warm, quietly triumphant, koto arpeggios, lyrical shakuhachi lead, warm sustained string section, soft taiko heartbeat, subtle sho mouth organ pad, 66 BPM, slow 4/4, bright major pentatonic yo scale, open bright hall reverb, generous but uncluttered, constant dynamics, no swells, seamless loop, mixed to sit under spoken narration',
    instruments:
      'Thang ngũ cung sáng yo scale · Đàn Koto rải ấm · Khèn Sho tạo làn sương mờ cao quý.',
  },

  // ==========================================
  // 4. NINJA & NGHỆ THUẬT ẨN THÂN (ninja_shinobi)
  // ==========================================
  {
    id: 'ninja_shinobi',
    themeKey: 'ninja_shinobi',
    label: 'Sáo Shinobue Đêm Tĩnh Mịch & Rình Rập Kẻ Địch',
    sublabel: 'Nín Thở, Căng Thẳng, Nhịp Rubato Tự Do Khó Đoán — 50 BPM',
    icon: '🥷',
    useCase:
      'Căng nhưng không hành động dồn dập. Thưa tiếng, nhiều khoảng trống, không có giai điệu bắt tai — giữ cảm giác một bóng đen đang nép mình trên xà nhà quan sát mọi động tĩnh.',
    prompt:
      'Japanese traditional instrumental, watchful and quiet, held tension, sparse single notes on shinobue bamboo flute, muted koto harmonics, low bowed drone, soft shakuhachi breath tones, occasional single taiko rim tap, 50 BPM, free-time rubato feel, minor pentatonic, wide empty space between phrases, dark natural reverb, no melodic hook, constant low dynamics, no build-ups, seamless loop, mixed to sit under spoken narration',
    instruments:
      '篠笛 Shinobue sáo ngang mảnh rợn tóc gáy · Nhịp rubato tự do không bắt kịp · Koto gảy câm nín.',
  },
  {
    id: 'ninja_shadow_infiltrator',
    themeKey: 'ninja_shadow_infiltrator',
    themeKey: 'ninja_shinobi',
    label: 'Đột Nhập Bóng Tối & Phi Tiêu Trong Mưa',
    sublabel: 'Tiếng Gió Đêm, Nhịp Đập Thấp Căng Như Dây Đàn — 58 BPM',
    icon: '🌑',
    useCase:
      'Dành cho các tình tiết lẻn vào lâu đài, vượt hào sâu, ám sát ngấm ngầm. Tiếng gõ nhẹ thành trống như tiếng bước chân trên ngói, âm sub-bass đe dọa.',
    prompt:
      'Stealth espionage documentary underscore, Japanese ninja theme, midnight infiltration tension, subtle metallic sound accents like shuriken, muted shamisen plucks, breathy dark woodwind tones, very soft steady subterranean bass pulse, ominous ambient night wind texture, 58 BPM, slow stealthy 4/4 meter, dark minor scale, ultra-sparse minimalist arrangement, constant low dynamics, zero crescendo, seamless loop, mixed to sit under dramatic storytelling voice',
    instruments:
      'Tiếng kim loại lướt phi tiêu · Shamisen gảy ngắt tiếng · Gió đêm u ám · Âm lượng cực thấp không tranh tiếng đọc.',
  },
  {
    id: 'feudal_tyrants',
    themeKey: 'ninja_shinobi',
    label: 'Âm Mưu Thâm Cung & Án Tử Bất Ngờ',
    sublabel: 'Lạnh Lùng, Đe Dọa, Hiểm Nguy Rình Rập — 52 BPM',
    icon: '🩸',
    useCase:
      'Dành cho các bẫy phục kích hiểm độc, thủ đoạn chính trị tàn bạo, độc dược và sát thủ tử chiến trong bóng tối.',
    prompt:
      'Japanese traditional instrumental, dark ominous and chilling, feudal tension and brutal power, harsh sharp satsuma biwa strikes, deep threatening taiko pulses like an execution drum, dissonant low shakuhachi tones, dark sustained bass drone, 52 BPM, slow deliberate 4/4, dark minor pentatonic, menacing atmosphere, constant low cold dynamics, no sudden jumps, seamless loop, mixed to sit under spoken narration',
    instruments:
      'Tỳ bà gắt sắc lạnh · Trống Taiko đe dọa như tiếng máy chém · Shakuhachi quãng nghịch u uất.',
  },

  // ==========================================
  // 5. LOFI CHILL BEATS & TẬP TRUNG HỌC TẬP (lofi_chill)
  // ==========================================
  {
    id: 'lofi_chill',
    themeKey: 'lofi_chill',
    label: 'Mưa Rơi Bên Cửa Sổ & Jazz Piano Ấm Áp',
    sublabel: 'Đĩa Than Vinyl Cổ Điển, Êm Dịu, Deep Focus — 70 BPM',
    icon: '☕',
    useCase:
      'Dành cho video đọc sách, tâm sự đêm muộn, podcast chia sẻ cuộc sống, vlog học tập làm việc. Giai điệu piano jazz ngọt ngào kết hợp tiếng mưa rơi tí tách và đĩa than cọt kẹt cổ điển.',
    prompt:
      'Lofi hip hop instrumental background music, soft cozy jazz piano chords, gentle muted guitar arpeggio, subtle vinyl crackle and distant soft rain sound, warm analog tape saturation, smooth mellow bass, 70 BPM, steady slow boom-bap rhythm, no vocals, warm bedroom aesthetic, constant calm dynamics, no beat drop, no sudden build-up, seamless loop, mixed to sit under voiceover',
    instruments:
      'Rhodes electric piano jazz ấm · Guitar mộc tỉa nhẹ · Đĩa than vinyl crackle vintage · Mưa rơi êm đềm bên cửa sổ.',
  },
  {
    id: 'lofi_tokyo_night_guitar',
    themeKey: 'lofi_chill',
    label: 'Ngắm Phố Đêm & Guitar Mộc Acoustic Lofi',
    sublabel: 'Đèn Đường Vàng, Thong Thả, Thư Giãn Tối Đa — 68 BPM',
    icon: '🎸',
    useCase:
      'Dành cho video tản văn, hoài niệm, chia sẻ trải nghiệm du lịch, lắng đọng sau ngày dài. Tiếng đàn guitar acoustic mộc mạc hòa cùng nhịp trống lofi búng tay nhẹ tênh.',
    prompt:
      'Chill lofi acoustic guitar background music, intimate nylon string guitar picking, warm electric bassline, relaxed slow lofi drum groove with soft brush snare, gentle street ambience at night, warm lo-fi tape hiss, 68 BPM, slow laid-back 4/4, soothing major seventh chords, comforting cozy atmosphere, constant peaceful dynamics, no volume swell, seamless loop, mixed to sit under soft storytelling narration',
    instruments:
      'Guitar acoustic mộc mạc · Bass điện trầm ấm · Chổi quét snare mềm mịn · Không gian ngắm phố đêm ấm áp.',
  },
  {
    id: 'lofi_morning_coffee_study',
    themeKey: 'lofi_chill',
    label: 'Cà Phê Sáng & Tia Nắng Khởi Đầu Ngày Mới',
    sublabel: 'Tươi Sáng, Tập Trung Tích Cực, Hứng Khởi Nhẹ Nhàng — 75 BPM',
    icon: '🥐',
    useCase:
      'Dành cho video buổi sáng, thói quen tích cực, mẹo phát triển bản thân, học ngoại ngữ. Giai điệu tươi tắn, không buồn bã, tiếp thêm năng lượng học tập tập trung.',
    prompt:
      'Morning coffee lofi study beat, bright and optimistic yet calm, cheerful Rhodes piano melody, light acoustic ukulele strumming, smooth warm 808 bass, crisp finger snap percussion, birds chirping quietly outside, 75 BPM, gentle uplifting boom bap rhythm, sunny warm vibes, constant steady dynamics, seamless loop, mixed to sit under voiceover tutorial',
    instruments:
      'Rhodes piano rạng rỡ · Ukulele gảy nhẹ nhàng · Tiếng búng tay giòn tan · Năng lượng tích cực khởi đầu ngày mới.',
  },

  // ==========================================
  // 6. AMBIENT GIẤC NGỦ & SÓNG NÃO 528HZ (ambient_sleep)
  // ==========================================
  {
    id: 'ambient_sleep',
    themeKey: 'ambient_sleep',
    label: 'Sóng Não Delta & Tần Số Chữa Lành 528Hz',
    sublabel: 'Ru Ngủ Sâu, Không Tiếng Gõ, An Nhiên Tột Cùng — 45 BPM',
    icon: '🌙',
    useCase:
      'Dành cho video kể chuyện đêm ru ngủ, thôi miên giấc ngủ sâu, thiền chữa lành tổn thương. Lớp pad âm thanh trôi dạt vô tận, không có bất kỳ tiết tấu gõ nào làm giật mình.',
    prompt:
      'Deep ambient sleep music, 528Hz healing frequency tone, endless warm drifting synthesizer pads, gentle oceanic swell, soft ethereal crystal chimes, delta wave meditative atmosphere, 45 BPM, continuous floating drone, zero percussion, ultra-smooth slow transitions, no sudden volume changes, seamless infinite loop, perfectly mixed for deep relaxation and voiceover sleep stories',
    instruments:
      'Synthesizer pad ấm trôi dạt · Tần số 528Hz dao động thư giãn tế bào · Chuông pha lê mờ ảo xa xăm · Tuyệt đối không có trống.',
  },
  {
    id: 'ambient_ocean_night_waves',
    themeKey: 'ambient_sleep',
    label: 'Sóng Biển Đêm & Ngân Hà Vô Tận',
    sublabel: 'Tiếng Sóng Vỗ Rì Rào Mềm Mại, Xua Tan Căng Thẳng Não Bộ — 42 BPM',
    icon: '🌊',
    useCase:
      'Dành cho video đọc truyện cổ tích đêm muộn, tâm lý học giấc ngủ, thư giãn ASMR. Tiếng sóng biển êm đềm như nhịp thở của đại dương hòa quyện cùng dải ngân hà huyền diệu.',
    prompt:
      'Cosmic ocean ambient sleep underscore, gentle rhythmic ocean waves washing ashore, vast warm ambient drone, soothing celestial choir pad, soft warm harp glissando in the distance, 42 BPM, ultra-slow fluid motion, completely percussion-free, immersive warm low frequencies, constant gentle dynamics, seamless loop, mixed to sit under soothing bedtime voice narration',
    instruments:
      'Tiếng sóng biển đêm vỗ bờ rì rào · Dải drone ấm áp che chở · Tiếng đàn hạc harp lướt dịu dàng · Nhẹ nhàng ru vào giấc ngủ say.',
  },
  {
    id: 'ambient_rainforest_healing_432hz',
    themeKey: 'ambient_sleep',
    label: 'Mưa Rừng Nhiệt Đới & Tần Số Tự Nhiên 432Hz',
    sublabel: 'Mưa Rơi Tí Tách Trên Lá Rừng, Tĩnh Tại & Phục Hồi Thần Kinh — 44 BPM',
    icon: '🌿',
    useCase:
      'Dành cho video phục hồi năng lượng tinh thần, chữa lành kiệt sức (burnout), thiền buông thư. Tiếng mưa rơi êm dịu trên lá hòa cùng âm hưởng hòa ca của thiên nhiên hoang sơ.',
    prompt:
      'Healing rain ambient background music, natural 432Hz harmonic tuning, gentle rainfall on tropical jungle leaves, warm acoustic cello sustaining long peaceful notes, soft atmospheric synth wash, serene forest tranquility, 44 BPM, slow unmeasured flow, organic relaxing soundscape, zero drums, constant uniform volume level, seamless loop, mixed to sit under guided meditation and sleep narration',
    instruments:
      'Mưa rơi tí tách trên vòm lá · Cello ngân dài ấm áp tần số 432Hz · Không khí thanh sạch rừng già · Thư giãn hệ thần kinh.',
  },

  // ==========================================
  // 7. PIANO THƠ MỘNG PHONG CÁCH GHIBLI (ghibli_piano)
  // ==========================================
  {
    id: 'ghibli_piano',
    themeKey: 'ghibli_piano',
    label: 'Mùa Hè Tuổi Thơ & Dàn Dây Joe Hisaishi',
    sublabel: 'Trong Veo, Gió Thổi Đồng Cỏ Xanh, Nhịp 3/4 Valse Hoài Niệm — 68 BPM',
    icon: '🎹',
    useCase:
      'Dành cho video kể chuyện tuổi thơ, ký ức học trò, tình cảm gia đình, phim hoạt hình anime. Giai điệu piano trong trẻo như giọt sương mai hòa cùng dàn dây violon êm ái gợi nhắc Spirited Away, My Neighbor Totoro.',
    prompt:
      'Nostalgic anime soundtrack instrumental in the style of Studio Ghibli, gentle lyrical acoustic grand piano lead, lush warm cinematic string orchestra accompaniment, bittersweet summer memory, pastoral gentle breeze, 68 BPM, moderate slow 3/4 waltz tempo, beautiful pentatonic and diatonic melody, natural wooden concert hall reverb, constant delicate dynamics, no loud crescendo, seamless loop, mixed to sit under storytelling',
    instruments:
      'Acoustic Grand Piano trong trẻo mộc mạc · Dàn dây strings mượt mà kiểu Joe Hisaishi · Giai điệu hoài niệm tuổi thơ.',
  },
  {
    id: 'ghibli_coastal_town_sky',
    themeKey: 'ghibli_piano',
    label: 'Thị Trấn Ven Biển & Bay Lượn Trên Bầu Trời',
    sublabel: 'Tươi Sáng, Hy Vọng, Phong Cách Kiki’s Delivery Service — 76 BPM',
    icon: '🌤️',
    useCase:
      'Dành cho video truyền cảm hứng, ước mơ tuổi trẻ, chuyến hành trình khám phá thế giới. Tiếng piano rộn rã kết hợp sáo flute bay bổng và đàn dây nhảy nhót vui tươi.',
    prompt:
      'Whimsical pastoral anime film score instrumental, Studio Ghibli seaside town adventure theme, bright playful acoustic piano, airy wooden flute melodic duet, light bouncing pizzicato and warm cello, gentle sea breeze accordion touch, 76 BPM, graceful moderate tempo, uplifting hopeful diatonic melody, lush European acoustic recording, constant joyful dynamics, no brass blasts, seamless loop, mixed to sit under narrative voice',
    instruments:
      'Piano rạng rỡ hy vọng · Sáo trúc Flute bay lượn · Phong cầm Accordion lãng mạn · Tươi sáng và ấm áp.',
  },
  {
    id: 'ghibli_rainy_bus_stop',
    themeKey: 'ghibli_piano',
    label: 'Trạm Xe Buýt Chiều Mưa & Kỷ Niệm Êm Đềm',
    sublabel: 'Lắng Đọng, Ấm Áp, Tiếng Đàn Du Dương Trong Mưa Bay — 60 BPM',
    icon: '☔',
    useCase:
      'Dành cho video tâm sự về tình yêu trong sáng, sự che chở, những cuộc hội ngộ và chia ly giàu cảm xúc. Tiếng đàn piano rơi từng phím lắng đọng giữa không gian mưa chiều ấm cúng.',
    prompt:
      'Emotional sentimental anime soundtrack, cozy rain shelter piano theme, slow heartfelt grand piano melody, warm cello solo counterpoint, distant gentle rainfall texture, nostalgic bittersweet melancholy, 60 BPM, expressive slow 4/4 meter, touching romantic harmonies, spacious intimate acoustic, constant soft dynamics, seamless loop, mixed to sit under emotional storytelling and poetry reading',
    instruments:
      'Grand Piano giàu cảm xúc · Solo Cello trầm ấm đối đáp · Tiếng mưa bay nhẹ mờ ảo · Rất lắng đọng và chạm đến trái tim.',
  },

  // ==========================================
  // 8. KIẾN THỨC, KHOA HỌC & KHÁM PHÁ THÚ VỊ (knowledge_curiosity)
  // ==========================================
  {
    id: 'knowledge_curiosity',
    themeKey: 'knowledge_curiosity',
    label: 'Kiến Thức & Khoa Học Tò Mò ("Ten Ten Ten")',
    sublabel: 'Pizzicato Strings & Marimba Nảy Vui Tai — Video Tiếng Việt — 108 BPM',
    icon: '💡',
    useCase:
      'Dành cho video kiến thức khoa học, giải thích hiện tượng, sự thật thú vị bằng TIẾNG VIỆT (kênh YouTube/TikTok/Reels phong cách Kurzgesagt, Ted-Ed, Động Lực, Tri Thức). Tiếng đàn dây gảy ngón pizzicato nảy tưng tửng ("ten ten ten"), đàn gõ marimba và chuông gõ glockenspiel trong trẻo ("tin tin tin"), giai điệu tò mò, dí dỏm, rất bắt tai và tạo khoảng trống dải tần trung âm hoàn hảo cho giọng thuyết minh tiếng Việt.',
    prompt:
      'Quirky playful science and trivia documentary underscore, curious and clever, bouncy staccato pizzicato violin and cello plucks, cheerful wooden marimba melody, bright bell-like glockenspiel accents, light acoustic upright bass walking line, subtle gentle shaker groove, 108 BPM, light bouncy 4/4 time, cheerful C major and A minor diatonic scale, clean dry studio acoustic, sparse arrangement, constant dynamics, no build-ups, seamless loop, mixed to sit under Vietnamese spoken narration and educational voiceover',
    instruments:
      'Pizzicato strings gảy ngón ("ten ten ten") · Marimba phím gỗ nảy vui nhộn · Glockenspiel chuông gõ trong trẻo ("tin tin tin") · Upright bass nhún nhảy nhịp nhàng giữ nhịp tò mò.',
  },
  {
    id: 'smart_trivia_puzzle',
    themeKey: 'knowledge_curiosity',
    label: 'Mẹo Vặt & Tư Duy Trí Tuệ',
    sublabel: 'Đố Vui, Khám Phá Bất Ngờ — Video Tiếng Việt — 112 BPM',
    icon: '🧩',
    useCase:
      'Dành cho video giải mã bí ẩn khoa học đời sống, mẹo vặt thường thức, câu đố tư duy bằng TIẾNG VIỆT. Âm thanh mộc lách cách thông minh, nhẹ nhàng và cuốn hút, giữ người xem theo dõi hết clip.',
    prompt:
      'Upbeat explainer and trivia background music, witty and inquisitive, playful wooden xylophone and vibraphone arpeggios, soft muted acoustic guitar tick, gentle pizzicato accents, warm electric piano chords, light finger snaps and rim click rhythm, 112 BPM, steady curious groove, bright diatonic, pristine mix, very sparse, constant dynamics, no crescendo, seamless loop, mixed to sit under Vietnamese voiceover',
    instruments:
      'Xylophone & Vibraphone gõ lách cách thông minh · Guitar mộc tỉa êm · Tiếng búng tay nhẹ nhàng · Âm lượng đều đặn không giật mình.',
  },
  {
    id: 'explainer_infographic_science',
    themeKey: 'knowledge_curiosity',
    label: 'Khoa Học Vũ Trụ & Đồ Họa Giải Thích',
    sublabel: 'Hiện Đại, Kỳ Thú, Phong Cách Kênh Khám Phá Tri Thức — 110 BPM',
    icon: '🚀',
    useCase:
      'Dành cho video về thiên văn vũ trụ, công nghệ tương lai, cơ thể con người, lịch sử tiến hóa. Âm hưởng vừa kỳ diệu vừa thông thái, kết hợp synth bass ấm, guitar mộc và tiếng gõ tinh tế.',
    prompt:
      'Modern scientific explainer underscore, wondrous and fascinating, intelligent upbeat documentary theme, gentle pulsing warm analog synth bass, delicate acoustic guitar arpeggios, light electronic percussion click, sparkling glockenspiel star-like tones, 110 BPM, fluid steady 4/4 groove, inspirational mix of wonder and clarity, very sparse mix, constant dynamics, no sudden drops, seamless loop, mixed to sit under educational documentary narration',
    instruments:
      'Analog synth bass ấm áp nhịp nhàng · Guitar mộc rải nốt kỳ thú · Glockenspiel lấp lánh như sao trời · Nhịp gõ điện tử mượt mà.',
  },
];

/** Lấy bản nhạc gợi ý cho một nhóm chủ đề đang chọn ở form. */
export function getBgMusicPromptForTheme(themeKey) {
  if (['news_journalism', 'news', 'article_news_stick_figure'].includes(themeKey)) {
    return BG_MUSIC_PROMPTS.find((p) => p.themeKey === 'news_journalism') || BG_MUSIC_PROMPTS[0];
  }
  return BG_MUSIC_PROMPTS.find((p) => p.themeKey === themeKey || p.id === themeKey) || BG_MUSIC_PROMPTS[0];
}
