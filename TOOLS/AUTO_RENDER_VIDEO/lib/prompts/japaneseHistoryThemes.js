/**
 * Các nhóm chủ đề của skill "Lịch Sử Nhật Bản, Samurai & Ninja".
 *
 * Cấu trúc giống hệt buddhistThemes.js để hai skill dùng chung được bộ luật ở
 * japaneseNarrativeShared.js — chỉ khác BỐI CẢNH và NHÂN VẬT, đúng như yêu cầu.
 *
 * Các trường:
 *   label / sublabel / description -> hiển thị trên thẻ chọn (label tiếng Nhật)
 *   en      -> tên tiếng Anh, ĐI VÀO PROMPT để model hiểu không mơ hồ
 *   story   -> hình dáng câu chuyện, chèn vào prompt kịch bản
 *   motifs  -> menu hình ảnh cho visualDescription, chỉ nằm trong prompt kịch bản
 *   mood    -> câu KHÔNG-CHỦ-THỂ duy nhất được phép chèn vào prompt ảnh cuối cùng
 *
 * LƯU Ý VỀ ÁNH SÁNG: bộ luật chung cấm cảnh đêm (tranh màu nước nền trắng vẽ cảnh tối ra xám đục).
 * Với đề tài ninja — vốn gắn với bóng đêm — motif ở đây cố ý chọn những khoảnh khắc BAN NGÀY của
 * nghề đó: mái ngói lúc rạng sáng, bóng người sau vách giấy giữa trưa, dấu chân trên sương.
 */
export const JAPANESE_HISTORY_THEMES = [
  {
    key: 'japan_history',
    label: '日本の歴史',
    sublabel: 'Lịch Sử Nhật Bản',
    en: 'Japanese history: the events and people that shaped the country',
    icon: '🏯',
    accentColor: '#c084fc',
    description: 'Những biến cố và con người làm nên nước Nhật — từ triều đình Heian, loạn Sengoku, tới Minh Trị Duy Tân.',
    story: 'Tell ONE episode of Japanese history through the people who lived it, not through dates. Pick a single decision, a single day, or a single person, and stay there. Name the era plainly once (平安, 戦国, 江戸, 明治). Say what is documented and say plainly when something is legend rather than record — never blur the two.',
    motifs: 'a castle keep rising above stone walls and a moat, a courier running a post road with a lacquered box on his back, an official in court robes kneeling before an unrolled scroll, a harbour of wooden ships under a wide pale sky, a village of thatched roofs below terraced fields, a stone milestone at a mountain pass',
    mood: 'Wide and consequential, the weight of something that actually happened.'
  },
  {
    key: 'samurai_era',
    label: '侍の時代',
    sublabel: 'Thời Đại Samurai',
    en: 'The age of the samurai: bushido, service, and the warrior class',
    icon: '⚔️',
    accentColor: '#f43f5e',
    description: 'Võ sĩ đạo, lòng trung thành và cái giá của nó — đời sống thật của tầng lớp samurai, không phải phim kiếm hiệp.',
    story: 'Tell one samurai story through a duty and its cost, not through a fight. The interesting part is the choice made before the sword is drawn, or the silence after. Name 武士道 or 忠義 once if it fits. Keep the violence off-screen or brief and plain — this channel is about what the decision cost the man, never about the spectacle.',
    motifs: 'a kneeling warrior in dark lacquered armour laying his long sword on a stand, a helmet with a wide neck-guard resting on a wooden block, a horse waiting at a castle gate at dawn, a training hall with worn floorboards and racked wooden swords, a banner with a family crest snapping in wind, an armourer binding lacquered plates with silk cord',
    mood: 'Grave and disciplined, held still, the calm before a decision.'
  },
  {
    key: 'ninja_shinobi',
    label: '忍者と忍びの術',
    sublabel: 'Ninja & Nghệ Thuật Ẩn Thân',
    en: 'Ninja and shinobi: the real craft of scouting, hiding and information',
    icon: '🥷',
    accentColor: '#38bdf8',
    description: 'Nghề nhẫn giả có thật ở Iga và Kōga — do thám, ẩn thân và đưa tin, khác hẳn hình ảnh trong phim.',
    story: 'Tell the shinobi as they actually worked: gathering information, moving unseen, getting a message out. The craft is patience and disguise, not acrobatics. Say plainly which parts are documented (Iga and Kōga provinces, the 万川集海 manual) and which parts are later legend. Never write a fantasy ninja — no fireballs, no flying.',
    motifs: 'a straw-hatted traveller resting at a roadside tea stall, a rolled message no longer than a finger held in one hand, bare footprints crossing a dew-wet roof of grey tiles, a figure flattened against a plastered wall in the strip of shade under deep eaves, a shadow falling across a paper screen from the far side, a coil of thin rope and a small hooked iron on a plank floor',
    mood: 'Watchful and quiet, held breath, attention on something just out of frame.'
  },
  {
    key: 'sengoku_events',
    label: '戦国の合戦と事件',
    sublabel: 'Sự Kiện Chiến Quốc Đáng Nhớ',
    en: 'Decisive battles and incidents of the Sengoku period, told day by day',
    icon: '🔥',
    accentColor: '#f97316',
    description: 'Những trận đánh và biến cố định đoạt vận mệnh nước Nhật — Okehazama, Kawanakajima, Honnō-ji, Sekigahara, Osaka.',
    story: 'Tell ONE named Sengoku event and stay inside it. Anchor it hard: the year, the province, the two sides, what each wanted. Then narrow to the hours that decided it — the march through the night, the order given at dawn, the man who changed sides at noon. Give the outcome plainly and say what it cost. Where the famous version of the event is an Edo-period embellishment (the three ranks of gunners at Nagashino, the single-combat duel at Kawanakajima), say so out loud and give the documented version instead.',
    motifs: 'a war camp of cloth screens and standing banners on a hillside at dawn, a commander reading a folded dispatch while a courier kneels waiting, ranks of foot soldiers with long spears seen from behind across a misty field, a castle gate barred from inside with heavy timbers, a mountain road packed with marching men and baggage horses, a battle standard planted in trampled ground',
    mood: 'Consequential and moving, a day that will not be undone.'
  },
  {
    key: 'heroes_legacy',
    label: '英傑たちの功績',
    sublabel: 'Anh Hùng & Cống Hiến',
    en: 'The greatness and lasting contributions of Japan\'s historical figures',
    icon: '🏆',
    accentColor: '#eab308',
    description: 'Sự vĩ đại của các anh hùng lịch sử đo bằng thứ họ để lại — luật lệ, đê điều, cải cách, nền hoà bình kéo dài hàng thế kỷ.',
    story: 'Tell what ONE historical figure actually built, and let that be the measure of the person. Not the battles they won — the thing that outlived them: a law code, a flood levee, a land survey, a market freed of tolls, two and a half centuries of peace. Show the problem before them, the decision, then the country afterwards. Their failures and their cruelty belong in the same account as their achievement; a person who is only admirable is a person who has been edited.',
    motifs: 'a long earthen embankment holding back a wide river with fields behind it, surveyors laying a measuring rope across a rice paddy while a clerk records figures, a market street of open stalls busy under deep eaves, an official reading a posted notice board at a crossroads, a castle town seen from a hill with roads running out of it, a writing table with an unrolled document and a brush laid across the stone',
    mood: 'Assured and admiring, the weight of something that outlasted its maker.'
  },
  {
    key: 'heroes_compared',
    label: '英雄たちの比較',
    sublabel: 'So Sánh Các Vị Anh Hùng',
    en: 'Comparing the great figures of the Sengoku age against one another',
    icon: '⚖️',
    accentColor: '#a78bfa',
    description: 'Đặt hai vị anh hùng cạnh nhau — Shingen và Kenshin, Nobunaga và Ieyasu — xem cùng một thế cục, mỗi người chọn đường khác nhau ra sao.',
    story: 'Put TWO real figures side by side and compare them through ONE thing they both faced — the same rival, the same year, the same kind of decision. Alternate between them cleanly so the listener always knows whose side of the story they are on. Compare what the record shows they DID, never their imagined personalities. End without crowning a winner: say what each man\'s choice bought him and what it cost him, and let the listener weigh it. The famous cuckoo poem that sorts the three unifiers by temperament is an Edo-period senryū, not their words — if you use it, say that plainly first.',
    motifs: 'two war banners with different family crests standing apart on the same hillside, a wide river valley with a camp on either bank, a folding map weighted open on a plank floor with two commanders on opposite sides of it, two mounted figures halted far apart across an open plain, a pair of helmets resting side by side on separate wooden blocks, a mountain pass seen from above with roads approaching it from two directions',
    mood: 'Even-handed and deliberate, two weights on the same scale.'
  },
  {
    key: 'tragic_history',
    label: '悲劇と苦難の歴史',
    sublabel: 'Bi Kịch & Biến Cố Đau Thương',
    en: 'Tragic history: catastrophic disasters, extreme casualties, deep grief, and the darkest hours of human loss',
    icon: '🥀',
    accentColor: '#e11d48',
    description: 'Những biến cố bi thương cùng cực — tập trung lột tả thương vong tàn khốc, nỗi đau quằn quại và sự diệt vong theo đúng sử liệu.',
    story: 'Tell ONE deeply tragic episode of Japanese history by directly confronting and detailing the documented casualties, the massive scale of devastation, and the heart-wrenching human suffering recorded in contemporary chronicles. Focus heavily on: the staggering casualty numbers, the desperate cries of victims, families torn apart, villages starved or burned to ash, boiling rivers, mass suicides in dark caves, and the lingering agony of survivors. Describe the harrowing historical truth without sanitizing it — let the unbearable weight of real human loss, sacrifice, and extreme grief dominate every segment.',
    motifs: 'a solitary burned wooden post standing in charred earth under drifting smoke, grey ash falling slowly across an empty dirt road, a small personal token or child comb lying half-buried in dried mud, silhouettes of weeping figures kneeling by a riverbank in heavy morning mist, a torn family banner fluttering on a desolate shore under a dark overcast sky, an empty ruined wooden gate with cold rain falling',
    mood: 'Devastatingly sorrowful and heavy, raw historical grief, the unbearable weight of catastrophic human loss.'
  },
  {
    key: 'feudal_tyrants',
    label: '暴君と非情の掟',
    sublabel: 'Bạo Chúa & Tội Ác Quyền Lực',
    en: 'Feudal tyrants and atrocities: extreme cruelty, bloody purges, and the darkest crimes of power',
    icon: '🩸',
    accentColor: '#b91c1c',
    description: 'Tội ác và sự tàn bạo cùng cực của các bạo chúa phong kiến — Nobunaga đốt núi Hiei, Hideyoshi tru diệt gia quyến Hidetsugu, nhục hình xứ Shimabara.',
    story: 'Tell ONE documented historical atrocity or act of extreme tyranny in feudal Japan with unvarnished, chilling honesty. Focus directly on the calculated cruelty, the bloody purges, the terrifying executions, and the horrifying abuse of power backed by genuine contemporary records (such as Ōta Gyūichi\'s Shinchō Kōki, Jesuit reports, court chronicles, and official shogunate logs). Detail the exact mechanisms of cruelty: the burning of holy mountains, whole families executed at riverside execution grounds, severed ears and noses counted for bounty, and brutal torture inflicted on helpless peasants. Expose the chilling reality of absolute power without glamorizing the tyrant.',
    motifs: 'a wooden execution platform surrounded by bamboo fences on a riverbank at grey dawn, a towering palisade of sharpened logs holding back fire and smoke, rows of severed heads displayed on wooden boards with inked name placards, a dark dungeon cell with heavy iron chains hanging from cedar pillars, a warlord sitting impassively on a camp stool as smoke rises from a distant burning temple, a bloodstained executioner blade resting on a wooden block',
    mood: 'Chilling, ominous and terrifyingly bleak, the cold cruelty of unrestrained feudal power.'
  }
];

export function getJapaneseHistoryTheme(key) {
  return JAPANESE_HISTORY_THEMES.find(t => t.key === key) || JAPANESE_HISTORY_THEMES[0];
}

export function getJapaneseHistoryThemeLabel(key) {
  const theme = getJapaneseHistoryTheme(key);
  return `${theme.label} (${theme.sublabel})`;
}
