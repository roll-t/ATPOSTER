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
 * Sáu bản nhạc, khớp 1-1 với sáu nhóm chủ đề trong japaneseHistoryThemes.js.
 * `themeKey` phải trùng key bên đó để sau này còn gợi ý đúng bản theo nhóm đang chọn.
 */
export const BG_MUSIC_PROMPTS = [
  {
    id: 'japan_history',
    themeKey: 'japan_history',
    label: '日本の歴史',
    sublabel: 'Lịch Sử Nhật Bản',
    icon: '🏯',
    useCase:
      'Bản dùng chung, an toàn nhất. Trang nghiêm và điềm tĩnh, hợp mọi bài kể biến cố hoặc nhân vật mà không nghiêng hẳn về trận mạc.',
    prompt:
      'Japanese traditional instrumental, documentary underscore, dignified and certain, unhurried, shakuhachi bamboo flute lead, satsuma biwa plucked accents, low koto ostinato, sustained cello drone, distant taiko heartbeat, 62 BPM, slow 4/4, minor pentatonic in-scale, wide natural hall reverb, sparse arrangement, constant dynamics, no build-ups, seamless loop, mixed to sit under spoken narration',
    instruments:
      '尺八 shakuhachi sáo trúc dẫn giai điệu · 琵琶 biwa đàn tỳ bà điểm nhịp · 箏 koto giữ nền · 太鼓 taiko trống xa như nhịp tim.',
  },
  {
    id: 'samurai_era',
    themeKey: 'samurai_era',
    label: '侍の時代',
    sublabel: 'Thời Đại Samurai',
    icon: '⚔️',
    useCase:
      'Trầm, nghiêm, nhiều khoảng lặng. Tỳ bà dẫn chính vì đây đúng là nhạc cụ dùng để kể chiến ký — các nhà sư mù xưa ngâm Bình Gia Vật Ngữ trên cây đàn này.',
    prompt:
      'Japanese traditional instrumental, restrained and grave, disciplined stillness, solo satsuma biwa plucked phrases with long silences between them, breathy low-register shakuhachi, muted koto, deep sustained strings, one soft taiko strike per phrase, 54 BPM, slow 4/4, minor pentatonic in-scale, close-mic biwa with wide room tail, very sparse, constant dynamics, no build-ups, seamless loop, mixed to sit under spoken narration',
    instruments:
      '薩摩琵琶 satsuma biwa tỳ bà võ sĩ, tiếng gắt và khô · khoảng lặng dài giữa các câu là chủ ý, để lời kể lọt vào.',
  },
  {
    id: 'ninja_shinobi',
    themeKey: 'ninja_shinobi',
    label: '忍者と忍びの術',
    sublabel: 'Ninja & Nghệ Thuật Ẩn Thân',
    icon: '🥷',
    useCase:
      'Căng nhưng không hành động. Thưa tiếng, nhiều khoảng trống, không có giai điệu bắt tai — giữ cảm giác đang quan sát và chờ đợi.',
    prompt:
      'Japanese traditional instrumental, watchful and quiet, held tension, sparse single notes on shinobue bamboo flute, muted koto harmonics, low bowed drone, soft shakuhachi breath tones, occasional single taiko rim tap, 50 BPM, free-time rubato feel, minor pentatonic, wide empty space between phrases, dark natural reverb, no melodic hook, constant low dynamics, no build-ups, seamless loop, mixed to sit under spoken narration',
    instruments:
      '篠笛 shinobue sáo ngang mảnh · rubato nhịp tự do, không đếm được — đó là thứ tạo cảm giác nín thở.',
  },
  {
    id: 'sengoku_events',
    themeKey: 'sengoku_events',
    label: '戦国の合戦と事件',
    sublabel: 'Sự Kiện Chiến Quốc Đáng Nhớ',
    icon: '🔥',
    useCase:
      'Bản hào hùng nhất, khớp với giọng kể chắc chắn và tự tin. Trống taiko giữ nhịp đều suốt bài — có sức nặng nhưng không dâng trào, nếu không sẽ nuốt mất tiếng đọc.',
    prompt:
      'Japanese traditional instrumental, heroic and resolute, historical documentary weight, taiko ensemble low steady pulse held at one level, satsuma biwa martial plucked figures, shakuhachi lead over sustained low strings, war drum ostinato, 72 BPM, controlled driving 4/4, minor pentatonic in-scale, large hall reverb, strong low end, constant dynamics with no crescendo, seamless loop, mixed to sit under spoken narration',
    instruments:
      '和太鼓 taiko giữ mạch đều · "held at one level" và "no crescendo" là hai cụm quan trọng nhất ở bản này — bỏ ra là Suno dựng cao trào ngay.',
  },
  {
    id: 'heroes_legacy',
    themeKey: 'heroes_legacy',
    label: '英傑たちの功績',
    sublabel: 'Anh Hùng & Cống Hiến',
    icon: '🏆',
    useCase:
      'Ấm và sáng hơn năm bản còn lại. Dùng thang yo — thang ngũ cung tươi của Nhật — thay cho thang tối, hợp với bài nói về thứ ai đó để lại cho đời sau.',
    prompt:
      'Japanese traditional instrumental, noble and warm, quietly triumphant, koto arpeggios, lyrical shakuhachi lead, warm sustained string section, soft taiko heartbeat, subtle sho mouth organ pad, 66 BPM, slow 4/4, bright major pentatonic yo scale, open bright hall reverb, generous but uncluttered, constant dynamics, no swells, seamless loop, mixed to sit under spoken narration',
    instruments:
      '陽旋法 yo scale thang ngũ cung sáng · 笙 sho khèn gagaku tạo lớp nền mờ như sương — chi tiết khiến bản này nghe cao quý chứ không bi.',
  },
  {
    id: 'heroes_compared',
    themeKey: 'heroes_compared',
    label: '英雄たちの比較',
    sublabel: 'So Sánh Các Vị Anh Hùng',
    icon: '⚖️',
    useCase:
      'Hai nhạc cụ đối đáp nhau, tách hẳn sang hai bên loa — sáo bên trái, tỳ bà bên phải. Cấu trúc âm thanh phản chiếu đúng cấu trúc bài nói: hai nhân vật đặt cạnh nhau.',
    prompt:
      'Japanese traditional instrumental, deliberate and even-handed, two alternating voices in call and response, shakuhachi phrase answered by satsuma biwa phrase, low koto ostinato holding both together, sustained strings, sparse taiko, 60 BPM, slow 4/4, minor pentatonic, wide stereo with flute panned left and biwa panned right, natural hall reverb, constant dynamics, no build-ups, seamless loop, mixed to sit under spoken narration',
    instruments:
      'call and response đối đáp · panned left / right tách hai bên — người nghe cảm được "hai phía" mà không cần bạn nói ra.',
  },
];

/** Lấy bản nhạc gợi ý cho một nhóm chủ đề lịch sử đang chọn ở form. */
export function getBgMusicPromptForTheme(themeKey) {
  return BG_MUSIC_PROMPTS.find((p) => p.themeKey === themeKey) || BG_MUSIC_PROMPTS[0];
}
