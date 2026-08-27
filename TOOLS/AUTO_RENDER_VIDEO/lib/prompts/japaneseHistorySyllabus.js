/**
 * Danh sách chủ đề gợi ý cho skill "Lịch Sử Nhật Bản, Samurai & Ninja".
 *
 * Cấu trúc giống buddhistSyllabus.js để dùng chung được modal chọn chủ đề — nhưng có THÊM hai
 * trường mà skill Phật giáo không cần, vì đây là đề tài LỊCH SỬ:
 *
 *   era    -> niên đại, đi thẳng vào prompt để Gemini không đặt câu chuyện sai thế kỷ.
 *   status -> mức độ tin cậy của sử liệu. Đây là trường QUAN TRỌNG NHẤT của file này:
 *               'record' — có sử liệu đương thời, kể như sự thật được.
 *               'mixed'  — sự kiện có thật NHƯNG bản kể phổ biến nhất lại là hư cấu đời sau.
 *                          Bắt buộc phải nói rõ chỗ nào là ghi chép, chỗ nào là truyền thuyết.
 *               'legend' — giai thoại, KHÔNG có sử liệu đương thời. Chỉ được kể như truyền thuyết.
 *   caution -> với 'mixed' và 'legend': nói chính xác chi tiết nào là hư cấu, để prompt cảnh báo
 *              Gemini đúng chỗ thay vì cảnh báo chung chung.
 *
 * VÌ SAO PHẢI CÓ status/caution: một kênh lịch sử mất uy tín không phải vì kể chán, mà vì chốt
 * một giai thoại đời Edo thành sự thật. Ba ví dụ kinh điển nằm ngay trong danh sách dưới đây —
 * ba hàng súng luân phiên ở Nagashino, bài thơ chim cuckoo xếp tính cách ba vị thống nhất, và
 * chuyện Kenshin gửi muối cho Shingen — đều là sáng tác đời sau, đều bị kể như sử thật ở khắp nơi.
 */
export const JAPANESE_HISTORY_SYLLABUS = {
  japan_history: [
    {
      id: 1,
      text: 'The Onin War: How the Shogunate Lost Control of Japan',
      vi: 'Loạn Ōnin: Khi Mạc Phủ Đánh Mất Quyền Kiểm Soát Nước Nhật',
      era: '1467–1477 (応仁の乱)',
      status: 'record',
      desc: 'Cuộc tranh chấp kế vị trong nhà Ashikaga biến Kyōto thành tro tàn suốt mười năm, mở đầu thời Chiến Quốc.'
    },
    {
      id: 2,
      text: 'The Arrival of Firearms at Tanegashima',
      vi: 'Súng Hoả Mai Cập Bến Tanegashima',
      era: '1543 (鉄砲伝来)',
      status: 'record',
      desc: 'Một con tàu Bồ Đào Nha dạt vào đảo nhỏ phía nam, và trong vài chục năm nước Nhật tự chế tạo súng nhiều bậc nhất thế giới.'
    },
    {
      id: 3,
      text: 'Heian Kyoto: The Court, the Seasons and the Diary Writers',
      vi: 'Kyōto Thời Heian: Triều Đình, Bốn Mùa và Những Người Viết Nhật Ký',
      era: '794–1185 (平安時代)',
      status: 'record',
      desc: 'Đời sống cung đình qua chính trang viết của Sei Shōnagon và Murasaki Shikibu — thứ sử liệu hiếm hoi do người trong cuộc để lại.'
    },
    {
      id: 4,
      text: 'The Mongol Invasions and the Storms That Followed',
      vi: 'Hai Lần Nguyên Mông Xâm Lược và Những Cơn Bão Sau Đó',
      era: '1274 và 1281 (元寇)',
      status: 'mixed',
      caution: 'Chữ 神風 "thần phong" và cách kể "bão trời cứu nước Nhật" là diễn giải đời sau. Bão có thật, nhưng phòng thủ trên bộ và bức tường đá Hakata cũng là nguyên nhân, đừng quy hết cho bão.',
      desc: 'Hai hạm đội lớn nhất thời trung đại đổ vào bờ biển Kyūshū, và điều thực sự đã chặn được chúng.'
    },
    {
      id: 5,
      text: 'Sakoku: How Japan Closed and What Still Came Through',
      vi: 'Toả Quốc: Nước Nhật Đóng Cửa và Những Gì Vẫn Lọt Vào',
      era: '1630s–1853 (鎖国)',
      status: 'mixed',
      caution: '"Đóng cửa hoàn toàn" là cách nói giản lược. Giao thương với Hà Lan ở Dejima, với Triều Tiên qua Tsushima, với nhà Thanh ở Nagasaki vẫn liên tục — sử học hiện nay tránh dùng chữ 鎖国 theo nghĩa tuyệt đối.',
      desc: 'Chính sách hạn chế ngoại giao kéo dài hai thế kỷ, và bốn cánh cửa vẫn để ngỏ mà ít người kể tới.'
    },
    {
      id: 6,
      text: 'The Black Ships of Commodore Perry',
      vi: 'Hắc Thuyền của Đề Đốc Perry',
      era: '1853–1854 (黒船来航)',
      status: 'record',
      desc: 'Bốn con tàu Mỹ neo ở vịnh Edo, và guồng máy hai trăm năm mươi năm bắt đầu rạn từ bên trong.'
    },
    {
      id: 7,
      text: 'The Meiji Restoration: A Country Rebuilt in One Generation',
      vi: 'Minh Trị Duy Tân: Dựng Lại Cả Một Nước Trong Một Thế Hệ',
      era: '1868–1889 (明治維新)',
      status: 'record',
      desc: 'Bãi bỏ phiên trấn, bỏ đặc quyền võ sĩ, lập nội các và hiến pháp — cải cách nhanh tới mức chính người trong cuộc cũng choáng.'
    },
    {
      id: 8,
      text: 'The Satsuma Rebellion and the Last Stand of the Samurai Class',
      vi: 'Loạn Satsuma: Trận Cuối Của Tầng Lớp Võ Sĩ',
      era: '1877 (西南戦争)',
      status: 'mixed',
      caution: 'Saigō Takamori không chết theo kiểu "kiếm chống súng" như phim. Quân nổi dậy dùng súng và pháo; và di ngôn cùng cách ông tự sát có nhiều dị bản, không có bản nào chắc chắn.',
      desc: 'Saigō Takamori và cuộc nổi dậy cuối cùng chống lại chính quyền Minh Trị mà chính ông đã góp phần dựng nên.'
    }
  ],

  samurai_era: [
    {
      id: 1,
      text: 'What a Samurai Actually Did on an Ordinary Day',
      vi: 'Một Ngày Bình Thường Của Võ Sĩ Thật Sự Trôi Qua Thế Nào',
      era: '江戸時代',
      status: 'record',
      desc: 'Phần lớn samurai thời Edo là công chức ăn lương gạo — sổ sách, trực gác, nợ nần, chứ không phải quyết đấu.'
    },
    {
      id: 2,
      text: 'Bushido Was Written Down After the Wars Ended',
      vi: 'Võ Sĩ Đạo Được Chép Thành Sách Khi Chiến Tranh Đã Tàn',
      era: '1716 (葉隠) và đời sau',
      status: 'mixed',
      caution: '『葉隠』 chép năm 1716, thời bình, và mãi tới thế kỷ 20 mới phổ biến. Cuốn "Bushido" của Nitobe Inazō (1900) viết bằng tiếng Anh cho độc giả phương Tây. Không được kể như thể võ sĩ thời Sengoku sống theo hai cuốn này.',
      desc: 'Bộ quy tắc mà ai cũng tưởng có từ thời loạn, thật ra được viết khi không còn trận nào để đánh.'
    },
    {
      id: 3,
      text: 'The Forty-Seven Ronin: The Record and the Kabuki Version',
      vi: 'Bốn Mươi Bảy Lãng Nhân: Bản Sử Liệu và Bản Kabuki',
      era: '1701–1703 (赤穂事件)',
      status: 'mixed',
      caution: 'Vụ án có thật và có hồ sơ. Nhưng 『忠臣蔵』 là kịch, đã đổi tên nhân vật, thêm tình tiết và động cơ. Nguyên nhân Asano rút kiếm trong điện tới nay vẫn không rõ — đừng chốt một lý do.',
      desc: 'Vụ báo thù nổi tiếng nhất lịch sử Nhật, và khoảng cách giữa hồ sơ toà án với vở kịch ba trăm năm.'
    },
    {
      id: 4,
      text: 'Miyamoto Musashi Beyond the Duels',
      vi: 'Miyamoto Musashi Ngoài Những Trận Quyết Đấu',
      era: '1584–1645',
      status: 'mixed',
      caution: 'Phần lớn giai thoại quyết đấu (kể cả trận đảo Ganryū với Sasaki Kojirō) đến từ nguồn đời sau và tiểu thuyết Yoshikawa Eiji. Chắc chắn có: 『五輪書』 do chính ông viết, và tranh thuỷ mặc của ông còn tới nay.',
      desc: 'Người kiếm sĩ được biết đến qua truyền thuyết, nhưng để lại thứ chắc chắn hơn: một cuốn sách và mấy bức tranh mực.'
    },
    {
      id: 5,
      text: 'The Sword Hunt: The Day the Farmers Were Disarmed',
      vi: 'Lệnh Thu Kiếm: Ngày Nông Dân Bị Tước Vũ Khí',
      era: '1588 (刀狩)',
      status: 'record',
      desc: 'Hideyoshi tách hẳn tầng lớp võ sĩ khỏi nông dân bằng một mệnh lệnh, định hình xã hội Nhật suốt ba thế kỷ sau.'
    },
    {
      id: 6,
      text: 'Seppuku: The Ritual, the Rules and the Second',
      vi: 'Mổ Bụng: Nghi Thức, Luật Lệ và Người Kaishaku',
      era: '中世〜江戸',
      status: 'record',
      desc: 'Một nghi lễ có quy tắc chặt chẽ và có người phụ tá — khác hẳn cảnh bi tráng đơn độc thường thấy trên phim.'
    },
    {
      id: 7,
      text: 'Women of the Warrior Households',
      vi: 'Phụ Nữ Trong Các Gia Tộc Võ Sĩ',
      era: '戦国〜江戸',
      status: 'record',
      desc: 'Quản gia sản, giữ thành khi chồng đi vắng, làm con tin liên minh — vai trò thật của phụ nữ nhà võ trong sử liệu.'
    },
    {
      id: 8,
      text: 'Ii Naomasa and the Red Devils of the Tokugawa',
      vi: 'Ii Naomasa và Đội Xích Quỷ Nhà Tokugawa',
      era: '1561–1602',
      status: 'record',
      desc: 'Đội quân sơn đỏ toàn bộ giáp trụ — một quyết định về tinh thần binh sĩ nhiều hơn là về chiến thuật.'
    }
  ],

  ninja_shinobi: [
    {
      id: 1,
      text: 'Iga and Koga: The Two Provinces That Made a Profession',
      vi: 'Iga và Kōga: Hai Vùng Đất Sinh Ra Một Nghề',
      era: '室町〜戦国',
      status: 'record',
      desc: 'Hai vùng núi tự trị, không có lãnh chúa lớn cai quản, đã biến kỹ năng do thám thành một nghề đem bán.'
    },
    {
      id: 2,
      text: 'The Bansenshukai: What the Manual Actually Teaches',
      vi: 'Vạn Xuyên Tập Hải: Cuốn Cẩm Nang Thật Sự Dạy Điều Gì',
      era: '1676 (万川集海)',
      status: 'mixed',
      caution: 'Sách biên soạn năm 1676, tức SAU thời hoạt động chính của shinobi, nhằm ghi lại nghề đang mai một. Nội dung nặng về do thám, tâm lý và thuốc men, không phải võ thuật siêu nhiên.',
      desc: 'Bộ sách nhẫn thuật nổi tiếng nhất — và phần lớn nội dung là thu thập tin tức, không phải đánh nhau.'
    },
    {
      id: 3,
      text: 'Oda Nobunaga Destroys Iga',
      vi: 'Oda Nobunaga Xoá Sổ Iga',
      era: '1579 và 1581 (天正伊賀の乱)',
      status: 'record',
      desc: 'Chiến dịch quy mô lớn nghiền nát vùng tự trị Iga, khiến người Iga phiêu tán khắp nước và đi làm thuê cho các lãnh chúa khác.'
    },
    {
      id: 4,
      text: 'Hattori Hanzo Was a Spear Commander, Not a Ninja Master',
      vi: 'Hattori Hanzō Là Tướng Cầm Thương, Không Phải Trùm Nhẫn Giả',
      era: '1542–1596',
      status: 'mixed',
      caution: 'Hattori Hanzō (Masanari) là VÕ TƯỚNG nhà Tokugawa, biệt danh 槍半蔵 "Hanzō cây thương". Ông chỉ huy người Iga chứ bản thân không phải shinobi hành nghề. Hình tượng "chúa tể ninja" là do đời sau và phim ảnh.',
      desc: 'Nhân vật ninja nổi tiếng nhất thế giới, và con người có thật đứng sau cái tên đó.'
    },
    {
      id: 5,
      text: 'The Escape Through Iga: Ieyasu\'s Most Dangerous Days',
      vi: 'Băng Qua Iga: Những Ngày Nguy Hiểm Nhất Của Ieyasu',
      era: '1582 (神君伊賀越え)',
      status: 'mixed',
      caution: 'Việc Ieyasu chạy về Mikawa sau biến Honnō-ji là có thật, và người Iga có hộ tống. Nhưng lộ trình cụ thể và mức độ nguy hiểm được kể rất khác nhau giữa các nguồn, phần lớn là nguồn đời Edo tôn vinh nhà Tokugawa.',
      desc: 'Chuyến chạy trốn xuyên núi sau khi Nobunaga chết, và món nợ mà nhà Tokugawa trả cho người Iga suốt hai thế kỷ.'
    },
    {
      id: 6,
      text: 'The Tools That Were Real and the Ones That Were Not',
      vi: 'Đồ Nghề Có Thật và Đồ Nghề Bịa Ra',
      era: '戦国〜江戸',
      status: 'mixed',
      caution: 'Có căn cứ: thang dây, móc sắt, thuốc, giấy tờ giả, hoá trang. Rất yếu căn cứ: bộ đồ đen bó sát (đến từ sân khấu kabuki, nơi người phụ việc mặc đen để coi như tàng hình) và phi tiêu hình sao như biểu tượng nghề.',
      desc: 'Phân loại thẳng thắn: thứ gì có trong sử liệu, thứ gì do sân khấu và điện ảnh dựng nên.'
    }
  ],

  sengoku_events: [
    {
      id: 1,
      text: 'The Battle of Okehazama: Nobunaga Against the Odds',
      vi: 'Trận Okehazama: Nobunaga Trước Thế Trận Chênh Lệch',
      era: '1560 (桶狭間の戦い)',
      status: 'mixed',
      caution: 'Kết quả chắc chắn: Imagawa Yoshimoto tử trận, Nobunaga thắng dù quân ít hơn nhiều. Không chắc chắn: con số quân hai bên (2.000 chống 25.000 là con số đời sau, có thể phóng đại) và chuyện tập kích được nhờ mưa giông.',
      desc: 'Trận đánh đưa một lãnh chúa nhỏ tỉnh Owari thành thế lực hàng đầu chỉ trong một buổi sáng.'
    },
    {
      id: 2,
      text: 'The Fourth Battle of Kawanakajima',
      vi: 'Trận Kawanakajima Lần Thứ Tư',
      era: '1561 (川中島の戦い)',
      status: 'mixed',
      caution: 'Năm lần giao tranh Shingen–Kenshin là có thật. Nhưng cảnh Kenshin một mình phi ngựa vào trại chém Shingen, Shingen đỡ bằng quạt sắt, là giai thoại từ 『甲陽軍鑑』 — nguồn đời sau, độ tin cậy thấp.',
      desc: 'Lần đụng độ đẫm máu nhất giữa Takeda Shingen và Uesugi Kenshin, và cảnh quyết đấu nổi tiếng chưa từng được xác thực.'
    },
    {
      id: 3,
      text: 'The Battle of Itsukushima: Mori Motonari\'s Night Crossing',
      vi: 'Trận Itsukushima: Chuyến Vượt Biển Đêm Của Mōri Motonari',
      era: '1555 (厳島の戦い)',
      status: 'record',
      desc: 'Dụ đối thủ lên một hòn đảo hẹp rồi vượt biển trong bão đêm — thắng lợi đưa nhà Mōri thành bá chủ miền tây.'
    },
    {
      id: 4,
      text: 'The Battle of Mikatagahara: The Defeat That Taught Ieyasu',
      vi: 'Trận Mikatagahara: Thất Bại Dạy Ieyasu Nên Người',
      era: '1573 (三方ヶ原の戦い)',
      status: 'mixed',
      caution: 'Ieyasu thua nặng trước Takeda Shingen là chắc chắn. Chuyện ông cho vẽ chân dung mình lúc bại trận (顰像) để tự răn là giai thoại lưu truyền, không có sử liệu đương thời xác nhận.',
      desc: 'Trận thua tệ nhất đời Tokugawa Ieyasu, và điều ông rút ra từ đó.'
    },
    {
      id: 5,
      text: 'The Battle of Nagashino and the Three Ranks That Never Were',
      vi: 'Trận Nagashino và Ba Hàng Súng Chưa Từng Tồn Tại',
      era: '1575 (長篠の戦い)',
      status: 'mixed',
      caution: 'CHỦ ĐỀ TRỌNG TÂM CỦA BÀI. Có căn cứ: liên quân Oda–Tokugawa thắng Takeda Katsuyori, súng hoả mai dùng với số lượng lớn sau hàng rào gỗ. KHÔNG có căn cứ đương thời: "3.000 khẩu chia ba hàng bắn luân phiên" — chi tiết này đến từ 『信長記』 của Oze Hoan, tác phẩm thế kỷ 17, sử học hiện nay không công nhận giá trị sử liệu.',
      desc: 'Trận đánh nổi tiếng vì một chiến thuật mà sử liệu đương thời không hề nhắc tới.'
    },
    {
      id: 6,
      text: 'The Honno-ji Incident: The Night Nobunaga Died',
      vi: 'Biến Honnō-ji: Đêm Nobunaga Chết',
      era: '1582 (本能寺の変)',
      status: 'mixed',
      caution: 'Chắc chắn: Akechi Mitsuhide làm phản, Nobunaga chết ở Honnō-ji, thi thể không tìm thấy. KHÔNG chắc chắn: ĐỘNG CƠ. Có hàng chục giả thuyết (bị làm nhục, tham vọng, bảo vệ triều đình, có kẻ giật dây) và không giả thuyết nào được sử học chốt lại. Phải trình bày như các giả thuyết song song.',
      desc: 'Vụ phản bội định hình lại nước Nhật, và câu hỏi vì sao đến nay vẫn chưa có lời đáp.'
    },
    {
      id: 7,
      text: 'The Great Return from Chugoku and the Battle of Yamazaki',
      vi: 'Đại Hồi Quân Chūgoku và Trận Yamazaki',
      era: '1582 (中国大返し・山崎の戦い)',
      status: 'record',
      desc: 'Hideyoshi nghe tin chủ chết, giảng hoà chớp nhoáng rồi hành quân ngược về hơn hai trăm cây số trong vài ngày để báo thù.'
    },
    {
      id: 8,
      text: 'The Battle of Shizugatake: Hideyoshi Takes the Succession',
      vi: 'Trận Shizugatake: Hideyoshi Đoạt Quyền Kế Vị',
      era: '1583 (賤ヶ岳の戦い)',
      status: 'record',
      desc: 'Cuộc so găng với Shibata Katsuie quyết định ai thừa kế sự nghiệp của Nobunaga.'
    },
    {
      id: 9,
      text: 'Komaki and Nagakute: The War Hideyoshi Could Not Win Outright',
      vi: 'Komaki và Nagakute: Cuộc Chiến Hideyoshi Không Thắng Nổi Bằng Vũ Lực',
      era: '1584 (小牧・長久手の戦い)',
      status: 'record',
      desc: 'Hideyoshi đối đầu Tokugawa Ieyasu, thua vài trận rồi kết thúc bằng ngoại giao thay vì chiến thắng quân sự.'
    },
    {
      id: 10,
      text: 'The Siege of Odawara: Unification by Encirclement',
      vi: 'Vây Thành Odawara: Thống Nhất Bằng Vòng Vây',
      era: '1590 (小田原征伐)',
      status: 'record',
      desc: 'Hideyoshi vây nhà Hōjō suốt ba tháng, dựng cả một thị trấn ngoài thành, kết thúc thời Chiến Quốc mà gần như không giao chiến.'
    },
    {
      id: 11,
      text: 'Sekigahara: The Day That Decided Japan',
      vi: 'Sekigahara: Ngày Định Đoạt Nước Nhật',
      era: '1600 (関ヶ原の戦い)',
      status: 'mixed',
      caution: 'Chắc chắn: Kobayakawa Hideaki đổi phe, quân Tây bại, Ieyasu thắng. Đang tranh cãi: thời điểm ông ta quyết định (nghiên cứu gần đây cho rằng ông theo Đông quân từ sớm chứ không do dự tới trưa) và chuyện Ieyasu bắn súng doạ để thúc ông ta là giai thoại đời sau.',
      desc: 'Sáu giờ đồng hồ trong sương mù, và một người đổi phe giữa trận.'
    },
    {
      id: 12,
      text: 'The Sieges of Osaka: The End of the Toyotomi',
      vi: 'Hai Trận Vây Thành Osaka: Kết Cục Nhà Toyotomi',
      era: '1614–1615 (大坂の陣)',
      status: 'record',
      desc: 'Điều khoản hoà ước mùa đông cho phép lấp hào, và mùa hè năm sau toà thành mạnh nhất nước Nhật không còn hào để giữ.'
    },
    {
      id: 13,
      text: 'The Shimabara Rebellion',
      vi: 'Khởi Nghĩa Shimabara',
      era: '1637–1638 (島原の乱)',
      status: 'record',
      desc: 'Cuộc nổi dậy của nông dân và tín đồ Kitô giáo vùng Kyūshū, và chính sách cấm đạo khắc nghiệt sau đó.'
    }
  ],

  heroes_legacy: [
    {
      id: 1,
      text: 'Nobunaga\'s Free Markets: Rakuichi Rakuza',
      vi: 'Chợ Tự Do Của Nobunaga: Rakuichi Rakuza',
      era: '1570s (楽市楽座)',
      status: 'record',
      desc: 'Xoá độc quyền phường hội và trạm thu phí dọc đường, cho ai cũng được buôn bán — cải cách kinh tế sống lâu hơn cả người đặt ra nó.'
    },
    {
      id: 2,
      text: 'The Taiko Land Survey: Measuring an Entire Country',
      vi: 'Thái Cáp Kiểm Địa: Đo Đạc Toàn Bộ Một Đất Nước',
      era: '1582–1598 (太閤検地)',
      status: 'record',
      desc: 'Hideyoshi thống nhất đơn vị đo, đo lại từng thửa ruộng cả nước, lập nền tảng thuế khoá cho ba trăm năm tiếp theo.'
    },
    {
      id: 3,
      text: 'Shingen\'s Levee: The Flood Wall That Still Stands',
      vi: 'Đê Shingen: Bờ Đê Còn Đứng Đến Hôm Nay',
      era: '16th century (信玄堤)',
      status: 'record',
      desc: 'Takeda Shingen trị thuỷ sông Kamanashi bằng hệ đê chuyển hướng dòng chảy — công trình vẫn còn dấu tích ở Yamanashi.'
    },
    {
      id: 4,
      text: 'The Koshu Code: Law in a Warring Province',
      vi: 'Kōshū Pháp Độ: Luật Lệ Giữa Một Xứ Đang Loạn',
      era: '1547 (甲州法度之次第)',
      status: 'record',
      desc: 'Bộ luật phân quốc của nhà Takeda, trong đó có điều khoản ràng buộc cả chính lãnh chúa — điều hiếm thấy thời đó.'
    },
    {
      id: 5,
      text: 'Two and a Half Centuries of Peace: What Ieyasu Built',
      vi: 'Hai Thế Kỷ Rưỡi Hoà Bình: Thứ Ieyasu Đã Dựng',
      era: '1603–1868 (江戸幕府)',
      status: 'record',
      desc: 'Hệ thống luân phiên trình diện, phân bổ lãnh địa và kiểm soát quan hệ đối ngoại giữ nước Nhật không nội chiến suốt hơn 250 năm.'
    },
    {
      id: 6,
      text: 'Hojo Soun and the First Modern Domain Government',
      vi: 'Hōjō Sōun và Mô Hình Cai Trị Lãnh Địa Đầu Tiên',
      era: '1432?–1519',
      status: 'mixed',
      caution: 'Năm sinh và xuất thân của Sōun từng bị kể sai suốt nhiều thế kỷ ("lãng nhân vô danh vươn lên"); nghiên cứu hiện nay xác định ông xuất thân từ gia tộc Ise có quan hệ với mạc phủ. Nên dùng bản đã được đính chính.',
      desc: 'Người đặt nền cai trị lãnh địa kiểu mới ở Kantō — giảm tô thuế, lập sổ hộ, ban điều huấn cho gia thần.'
    },
    {
      id: 7,
      text: 'Kenshin\'s Salt: The Gesture That May Never Have Happened',
      vi: 'Muối Của Kenshin: Nghĩa Cử Có Thể Chưa Từng Xảy Ra',
      era: '1567 (敵に塩を送る)',
      status: 'legend',
      caution: 'ĐÂY LÀ TRUYỀN THUYẾT, không phải sử liệu đương thời. Câu chuyện Kenshin tiếp muối cho xứ Kai đang bị cấm vận do các sử gia đời Edo chép lại, mỗi bản một khác. Thành ngữ 敵に塩を送る thì có thật và vẫn dùng tới nay. Phải kể rõ ràng đây là giai thoại ngay từ đầu.',
      desc: 'Giai thoại nổi tiếng nhất về khí phách võ sĩ, và điều sử liệu thật sự nói về nó.'
    },
    {
      id: 8,
      text: 'Mori Motonari\'s Letter to His Three Sons',
      vi: 'Lá Thư Mōri Motonari Gửi Ba Người Con',
      era: '1557 (三子教訓状)',
      status: 'mixed',
      caution: 'Lá thư 「三子教訓状」 là VĂN BẢN CÓ THẬT, còn lưu tới nay. Cảnh bẻ ba mũi tên thì là giai thoại đời sau, nhiều khả năng hư cấu. Kể lá thư như sử liệu, kể mũi tên như truyền thuyết.',
      desc: 'Bài học đoàn kết nổi tiếng nhất Nhật Bản — phần nào có thật, phần nào do đời sau thêm vào.'
    },
    {
      id: 9,
      text: 'Date Masamune Sends a Samurai to the Pope',
      vi: 'Date Masamune Gửi Một Võ Sĩ Tới Gặp Giáo Hoàng',
      era: '1613–1620 (慶長遣欧使節)',
      status: 'record',
      desc: 'Hasekura Tsunenaga vượt Thái Bình Dương, qua Tân Tây Ban Nha tới Madrid và Roma — sứ bộ Nhật đầu tiên tới châu Âu và châu Mỹ.'
    },
    {
      id: 10,
      text: 'Imagawa Yoshimoto Was Not the Fool History Made Him',
      vi: 'Imagawa Yoshimoto Không Phải Kẻ Ngốc Như Hậu Thế Kể',
      era: '1519–1560',
      status: 'mixed',
      caution: 'Hình ảnh "quý tộc bôi mặt trắng, ngồi kiệu, bất tài" là do các nguồn đời Edo tôn vinh Nobunaga dựng lên. Sử liệu cho thấy ông là nhà cai trị giỏi: bộ phân quốc pháp 『今川仮名目録』 và việc mở rộng lãnh địa ba tỉnh là bằng chứng.',
      desc: 'Người thua trận Okehazama, và bộ luật lãnh địa xuất sắc mà ít ai nhắc tới.'
    },
    {
      id: 11,
      text: 'Kato Kiyomasa and the Art of Building a Castle That Holds',
      vi: 'Katō Kiyomasa và Nghệ Thuật Xây Thành Không Thể Công Phá',
      era: '1562–1611',
      status: 'record',
      desc: 'Tường đá dốc cong của thành Kumamoto và hệ thống giếng, kho lương tính cho một cuộc vây hãm dài.'
    },
    {
      id: 12,
      text: 'Sanada Nobushige: The Last Charge at Osaka',
      vi: 'Sanada Nobushige: Đợt Xung Phong Cuối Ở Osaka',
      era: '1615 (大坂夏の陣)',
      status: 'mixed',
      caution: 'Tên thật là Nobushige (信繁); "Yukimura" là tên do tiểu thuyết đời Edo đặt và phổ biến tới mức lấn át tên thật. Lời khen 「日本一の兵」 xuất hiện trong 『薩藩旧記雑録』, tức nguồn của phía đối phương ghi lại.',
      desc: 'Đợt tấn công gần chạm tới bản doanh Ieyasu, và lời khen mà chính kẻ địch dành cho ông.'
    }
  ],

  heroes_compared: [
    {
      id: 1,
      text: 'The Three Unifiers and the Cuckoo Poem That They Never Wrote',
      vi: 'Ba Vị Thống Nhất và Bài Thơ Chim Cuckoo Họ Chưa Từng Viết',
      era: '16th century / thơ chép thế kỷ 19',
      status: 'mixed',
      caution: 'BẮT BUỘC NÓI RÕ NGAY ĐẦU BÀI: bài senryū 「鳴かぬなら…」 xếp tính cách Nobunaga/Hideyoshi/Ieyasu xuất hiện trong 『甲子夜話』 của Matsura Seizan, cuối thời Edo — tức hơn hai trăm năm sau khi cả ba đã chết. Đây KHÔNG phải lời của họ. Dùng bài thơ làm điểm vào rồi đối chiếu với việc làm có thật của từng người.',
      desc: 'Ba câu thơ ai cũng thuộc, và ba con người thật mà sử liệu cho thấy phức tạp hơn nhiều.'
    },
    {
      id: 2,
      text: 'Shingen and Kenshin: Two Ways to Run a Province',
      vi: 'Shingen và Kenshin: Hai Cách Cai Trị Một Xứ',
      era: '1553–1564',
      status: 'mixed',
      caution: 'Năm lần đối đầu ở Kawanakajima là có thật. Nhưng hình ảnh "kỳ phùng địch thủ trọng nhau" phần lớn là do 『甲陽軍鑑』 và văn học đời sau tô đậm. So sánh qua chính sách và văn thư còn lưu, không qua giai thoại.',
      desc: 'Một người trị thuỷ và làm luật, một người dựa vào kỷ luật và tín ngưỡng — hai mô hình cai trị đặt cạnh nhau.'
    },
    {
      id: 3,
      text: 'Ieyasu and Mitsunari: The Same Year, Two Calculations',
      vi: 'Ieyasu và Mitsunari: Cùng Một Năm, Hai Bài Toán',
      era: '1598–1600',
      status: 'record',
      desc: 'Sau khi Hideyoshi mất, hai người cùng nhìn một khoảng trống quyền lực và tính toán hoàn toàn khác nhau.'
    },
    {
      id: 4,
      text: 'The Two Bei: Takenaka Hanbei and Kuroda Kanbei',
      vi: 'Hai Chữ Bei: Takenaka Hanbei và Kuroda Kanbei',
      era: '1544–1579 / 1546–1604',
      status: 'mixed',
      caution: 'Cả hai đều là quân sư có thật của Hideyoshi. Nhưng biệt danh ghép "Lưỡng Binh Vệ" (両兵衛) và phần lớn giai thoại mưu lược đến từ 『太閤記』 đời Edo, cần nói rõ là nguồn đời sau.',
      desc: 'Hai quân sư của Hideyoshi, một người chết sớm giữa chiến dịch, một người sống để bị chính chủ đề phòng.'
    },
    {
      id: 5,
      text: 'Honda Tadakatsu and Ii Naomasa: Two Kinds of Loyalty',
      vi: 'Honda Tadakatsu và Ii Naomasa: Hai Kiểu Trung Thành',
      era: '1548–1610 / 1561–1602',
      status: 'mixed',
      caution: 'Chi tiết "Tadakatsu đánh hơn năm mươi trận không một vết thương" là lời truyền tụng, không kiểm chứng được. Sự nghiệp và lãnh địa được phong của cả hai thì có sử liệu rõ ràng.',
      desc: 'Hai trong Tứ Thiên Vương nhà Tokugawa, phục vụ cùng một chủ theo hai cách rất khác nhau.'
    },
    {
      id: 6,
      text: 'The Sanada Split: A Father and Two Sons on Opposite Sides',
      vi: 'Nhà Sanada Chia Đôi: Cha và Hai Con Ở Hai Chiến Tuyến',
      era: '1600 (犬伏の別れ)',
      status: 'mixed',
      caution: 'Việc nhà Sanada chia hai phe ở Sekigahara là có thật và có hệ quả rõ ràng. Nhưng cảnh "hội nghị Inubushi" cha con bàn bạc rồi chia tay là do nguồn đời sau dựng lại, không có ghi chép đương thời.',
      desc: 'Một gia tộc cố ý đặt cược cả hai cửa để dòng họ sống sót dù bên nào thắng.'
    },
    {
      id: 7,
      text: 'Nobunaga and Yoshiaki: The Shogun and the Man Who Installed Him',
      vi: 'Nobunaga và Yoshiaki: Vị Tướng Quân và Người Dựng Ông Lên',
      era: '1568–1573',
      status: 'record',
      desc: 'Nobunaga đưa Ashikaga Yoshiaki lên ngôi tướng quân, rồi năm năm sau chính tay chấm dứt mạc phủ Ashikaga.'
    },
    {
      id: 8,
      text: 'Shimazu and Chosokabe: Kyushu Against Shikoku',
      vi: 'Shimazu và Chōsokabe: Kyūshū Đối Đầu Shikoku',
      era: '1570s–1587',
      status: 'record',
      desc: 'Hai thế lực vùng biên cùng bành trướng mạnh, và cùng phải quy phục khi Hideyoshi đem đại quân xuống miền nam.'
    }
  ]
};

export function getJapaneseHistorySyllabusCount(themeKey) {
  if (!themeKey) {
    return Object.values(JAPANESE_HISTORY_SYLLABUS).reduce((sum, list) => sum + list.length, 0);
  }
  return (JAPANESE_HISTORY_SYLLABUS[themeKey] || []).length;
}

/** Tìm một chủ đề theo nguyên văn tiêu đề đã chọn ở form, để lấy lại era/status/caution cho prompt. */
export function findJapaneseHistoryTopic(scenarioText) {
  if (!scenarioText) return null;
  const needle = scenarioText.trim().toLowerCase();
  for (const list of Object.values(JAPANESE_HISTORY_SYLLABUS)) {
    for (const topic of list) {
      const full = `${topic.text} (${topic.vi})`.toLowerCase();
      if (needle === full || needle === topic.text.toLowerCase() || needle.includes(topic.text.toLowerCase())) {
        return topic;
      }
    }
  }
  return null;
}
