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
  {
    id: 'tragic_history',
    themeKey: 'tragic_history',
    label: '悲劇と苦難の歴史',
    sublabel: 'Bi Kịch & Biến Cố Đau Thương',
    icon: '🥀',
    useCase:
      'Bi thương, nặng nề, lắng đọng. Tỳ bà satsuma biwa buông từng tiếng gắt xót xa, sáo trúc shakuhachi chơi quãng trầm thê lương, khoảng lặng dài giữa các nốt thể hiện sự mất mát cùng cực và sức nặng của nỗi đau lịch sử.',
    prompt:
      'Japanese traditional instrumental, mournful and solemn, deep sorrow and heavy loss, elegiac documentary underscore, weeping solo shakuhachi flute, slow somber satsuma biwa plucked chords with long painful silences between phrases, sustained low cello drone, distant muffled taiko heartbeats, 48 BPM, very slow 4/4, melancholy minor pentatonic in-scale, dark natural hall reverb, sparse and weeping arrangement, constant low dynamics, no build-ups, seamless loop, mixed to sit under spoken narration',
    instruments:
      '尺八 shakuhachi sáo trầm thê lương · 薩摩琵琶 biwa nốt gảy xót xa · cello drone giữ độ sâu bi thương · khoảng lặng dài ngưng đọng.',
  },
  {
    id: 'feudal_tyrants',
    themeKey: 'feudal_tyrants',
    label: '暴君と非情の掟',
    sublabel: 'Bạo Chúa & Tội Ác Quyền Lực',
    icon: '🩸',
    useCase:
      'U tối, lạnh lẽo, căng thẳng và rợn gáy. Tiếng gảy tỳ bà biwa sắc lẹm đanh thép, trống taiko đánh chậm đe dọa như án tử, sáo trúc shakuhachi ở quãng nghịch u uất.',
    prompt:
      'Japanese traditional instrumental, dark ominous and chilling, feudal tension and brutal power, harsh sharp satsuma biwa strikes, deep threatening taiko pulses like an execution drum, dissonant low shakuhachi tones, dark sustained bass drone, 52 BPM, slow deliberate 4/4, dark minor pentatonic, menacing atmosphere, constant low cold dynamics, no sudden jumps, seamless loop, mixed to sit under spoken narration',
    instruments:
      '薩摩琵琶 biwa tiếng gắt lạnh lùng · 太鼓 taiko nhịp gõ đe dọa như án tử · sáo shakuhachi quãng nghịch u tối · không gian rợn gáy.',
  },
  {
    id: 'zen_meditation',
    themeKey: 'zen_meditation',
    label: '禅と瞑想',
    sublabel: 'Thiền Định & Phật Pháp',
    icon: '🪷',
    useCase:
      'Thanh tịnh, an nhiên và tĩnh lặng. Sáo trúc Shakuhachi ngân vang tự do kết hợp chuông xoay Tây Tạng và tiếng nước chảy khe núi.',
    prompt:
      'Zen meditation instrumental, deep spiritual stillness, tranquil bamboo forest ambience, slow resonant shakuhachi bamboo flute solo, distant singing bowl chime, soft trickle of stream water, subtle warm drone, 48 BPM, free tempo rubato, Japanese in-scale pentatonic, expansive quiet monastery acoustic, very sparse arrangement, constant gentle dynamics, no crescendo, seamless loop, mixed to sit under spoken Buddhist narration',
    instruments:
      '尺八 shakuhachi sáo trúc thanh tịnh · chuông xoay Tây Tạng điểm xuyết · tiếng nước êm đềm · không gian thiền viện tĩnh mịch.',
  },
  {
    id: 'lofi_chill',
    themeKey: 'lofi_chill',
    label: 'ローファイ・チル',
    sublabel: 'Lofi Chill & Học Tập',
    icon: '☕',
    useCase:
      'Ấm áp, thư giãn, giúp tập trung học tập và làm việc. Hợp âm jazz piano êm ái kết hợp tiếng đĩa than vinyl cọt kẹt và mưa rơi bên cửa sổ.',
    prompt:
      'Lofi hip hop instrumental background music, soft cozy jazz piano chords, gentle muted guitar arpeggio, subtle vinyl crackle and distant soft rain sound, warm analog tape saturation, smooth mellow bass, 70 BPM, steady slow boom-bap rhythm, no vocals, warm bedroom aesthetic, constant calm dynamics, no beat drop, no sudden build-up, seamless loop, mixed to sit under voiceover',
    instruments:
      'Rhodes piano jazz ấm áp · guitar mộc dịu êm · tiếng đĩa than cọt kẹt cổ điển · mưa rơi nhẹ bên khung cửa sổ.',
  },
  {
    id: 'ambient_sleep',
    themeKey: 'ambient_sleep',
    label: '安眠とデルタ波',
    sublabel: 'Ambient Giấc Ngủ & Sóng Não 528Hz',
    icon: '🌙',
    useCase:
      'Ru ngủ sâu, chữa lành tâm hồn, giảm căng thẳng. Lớp pad không gian vô tận kết hợp tần số 528Hz và sóng não Delta không lời.',
    prompt:
      'Deep ambient sleep music, 528Hz healing frequency tone, endless warm drifting synthesizer pads, gentle oceanic swell, soft ethereal crystal chimes, delta wave meditative atmosphere, 45 BPM, continuous floating drone, zero percussion, ultra-smooth slow transitions, no sudden volume changes, seamless infinite loop, perfectly mixed for deep relaxation and voiceover sleep stories',
    instruments:
      'Synthesizer pad ấm trôi dạt · tần số 528Hz rung động thư giãn · tiếng chuông pha lê xa xăm · hoàn toàn không bộ gõ.',
  },
  {
    id: 'ghibli_piano',
    themeKey: 'ghibli_piano',
    label: 'ジブリ風ピアノ',
    sublabel: 'Piano Hoài Niệm Phong Cách Ghibli',
    icon: '🎹',
    useCase:
      'Thơ mộng, hoài niệm về mùa hè tuổi thơ phong cách Joe Hisaishi. Tiếng đàn grand piano trong trẻo hòa cùng dàn dây violon êm ái.',
    prompt:
      'Nostalgic anime soundtrack instrumental in the style of Studio Ghibli, gentle lyrical acoustic grand piano lead, lush warm cinematic string orchestra accompaniment, bittersweet summer memory, pastoral gentle breeze, 68 BPM, moderate slow 3/4 waltz tempo, beautiful pentatonic and diatonic melody, natural wooden concert hall reverb, constant delicate dynamics, no loud crescendo, seamless loop, mixed to sit under storytelling',
    instruments:
      'Acoustic Grand Piano trong trẻo mộc mạc · dàn dây strings mượt mà kiểu Joe Hisaishi · giai điệu hoài niệm tuổi thơ.',
  },
];

export const MUSIC_PROMPT_CATEGORIES = [
  {
    id: 'zen_meditation',
    icon: '🪷',
    label: 'Thiền Định, Phật Giáo & Tĩnh Tâm',
    badge: 'THIỀN ĐỊNH & Y TĨNH',
    badgeBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    shortDescription: 'Sáo trúc Shakuhachi thanh tịnh, chuông xoay Tây Tạng, 432Hz an định tâm trí và tiếng nước chảy giúp tĩnh lặng tâm hồn.',
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
];

/** Lấy bản nhạc gợi ý cho một nhóm chủ đề lịch sử đang chọn ở form. */
export function getBgMusicPromptForTheme(themeKey) {
  return BG_MUSIC_PROMPTS.find((p) => p.themeKey === themeKey) || BG_MUSIC_PROMPTS[0];
}

