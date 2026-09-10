/**
 * Bộ nhận diện & ghim mốc thời gian / kỷ nguyên (Time Era Pinning Engine).
 *
 * PHÂN BIỆT RÕ RÀNG GIỮA:
 * 1. Thời kỳ CHƯA CÓ LOÀI NGƯỜI (Pre-Human Eras):
 *    - Trái Đất Tiền Sinh / Băng Hà Tuyết Cầu / 700 triệu - 4.5 tỷ năm trước (Snowball Earth, Đại Oxy hóa, Theia, Lớp phủ Manti).
 *    - Thời Khủng Long / Đại Trung Sinh / 66 - 250 triệu năm trước (Chicxulub, T-Rex, Pangea).
 *    -> TUYỆT ĐỐI CẤM người, cấm người que, cấm đền đài Hy Lạp/La Mã, cấm quần áo, cấm nhà cửa!
 * 2. Thời kỳ ĐÃ CÓ CON NGƯỜI TIỀN SỬ (Ice Age / Người tối cổ 2.5 triệu - 10.000 năm trước):
 *    - Chỉ có người mặc da thú, cầm rìu đá, hang động, voi ma mút. CẤM đền đài La Mã, cấm xe cộ.
 * 3. Thời kỳ VĂN MINH CỔ ĐẠI LOÀI NGƯỜI (Hy Lạp, La Mã, Ai Cập, Phong kiến 3000 TCN - thế kỷ 15):
 *    - Đền đài sa thạch, cột đá, áo choàng tunic, samurai, ninja.
 * 4. Thời kỳ CHIẾN TRANH CẬN ĐẠI (Thế chiến 1, Thế chiến 2).
 * 5. Thời kỳ HIỆN ĐẠI & ĐỜI SỐNG (Thế kỷ 21, công nghệ, văn phòng).
 * 6. Thời kỳ TƯƠNG LAI VIỄN TƯỞNG (Sci-Fi, Sao Hỏa, Pangea Ultima 250 triệu năm nữa).
 */

export const TIME_ERAS = {
  // 1. TRÁI ĐẤT TIỀN SINH & ĐỊA CẦU SƠ KHAI (CHƯA CÓ CON NGƯỜI)
  prehuman_primordial_earth: {
    key: 'prehuman_primordial_earth',
    isPreHuman: true,
    label: 'Trái Đất Sơ Khai & Tiền Sinh (700M - 4.5B năm trước, chưa có con người)',
    directive: 'STRICT TIME ERA — PRE-HUMAN PRIMORDIAL EARTH (Hundreds of Millions to Billions of Years Ago, Zero Humans Ever Existed): Untamed geological primordial Earth, global Snowball Earth ice sheets, massive glaciers, smoking volcanic magma fissures, subterranean glowing mantle crystals, cosmic space, or ancient pre-human atmosphere. STRICT SCIENTIFIC FACT: Humans have NOT evolved yet. ABSOLUTELY ZERO humans, ZERO stick figures, ZERO people, ZERO Greek/Roman stone temples, ZERO pillars, ZERO colonnades, ZERO stone streets, ZERO buildings, ZERO clothes or tunics. Pure pristine untouched prehistoric geological planet.',
    negative: 'human, person, man, woman, people, stick figure, stickman, character, face, temple, Greek temple, Roman temple, Parthenon, colonnade, pillar, ancient architecture, ruins, building, house, street, cobblestone, road, clothes, clothing, tunic, robe, cloak, shoes, modern clothes, modernity, civilization, city'
  },

  // 2. THỜI KHỦNG LONG / ĐẠI TRUNG SINH (CHƯA CÓ CON NGƯỜI)
  prehistoric_dinosaurs: {
    key: 'prehistoric_dinosaurs',
    isPreHuman: true,
    label: 'Thời Khủng Long / Đại Trung Sinh (66 - 250M năm trước, chưa có con người)',
    directive: 'STRICT TIME ERA — PREHISTORIC MESOZOIC ERA (66 Million Years Ago, Dinosaur Age, Pre-Human): Primeval prehistoric Earth wilderness with giant primitive ferns, cycads, smoking volcanoes, prehistoric craters, giant dinosaurs, or ancient reptiles. STRICT SCIENTIFIC FACT: Humans did NOT exist yet. ABSOLUTELY ZERO humans, NO modern clothes (no hoodies, no jeans), NO ancient Greek/Roman temples, NO buildings, NO brick walls, NO asphalt streets, NO cars. Pure prehistoric dinosaur wilderness.',
    negative: 'human, person, man, woman, people, stick figure, stickman, character, face, hoodie, jeans, jacket, sneakers, modern clothing, street, asphalt, road, car, vehicle, traffic, modern building, brick building, temple, Greek temple, Roman temple, colonnade, house, city, town, electricity, modernity'
  },

  // 3. KỶ BĂNG HÀ & NGƯỜI TIỀN SỬ (ĐÃ CÓ NGƯỜI TỐI CỔ / MẶC DA THÚ)
  ice_age_paleolithic: {
    key: 'ice_age_paleolithic',
    isPreHuman: false,
    label: 'Kỷ Băng Hà & Người Tiền Sử / Đồ Đá (Ice Age / Paleolithic)',
    directive: 'STRICT TIME ERA — PREHISTORIC ICE AGE / PALEOLITHIC ERA: Harsh glaciated tundra wilderness, woolly mammoths, frozen cliffs, crude stone-age campfire. Prehistoric humans wear rough primitive animal skins and furs, wielding rough stone tools. ABSOLUTELY NO modern cities, NO cars, NO modern buildings, NO jeans, NO hoodies, NO Greek/Roman stone temples, NO modern technology.',
    negative: 'modern buildings, brick walls, cars, asphalt, street, traffic, electricity, jeans, suit, hoodie, sneakers, glasses, modern haircut, modern furniture, Greek temple, Roman temple, colonnade, contemporary world'
  },

  // 4. CỔ ĐẠI & PHONG KIẾN LOÀI NGƯỜI
  ancient_civilization: {
    key: 'ancient_civilization',
    isPreHuman: false,
    label: 'Cổ Đại & Phong Kiến Loài Người (Hy Lạp, La Mã, Ai Cập, Cổ trang)',
    directive: 'STRICT TIME ERA — ANCIENT HUMAN CIVILIZATION / CLASSICAL ANTIQUITY: Period-accurate ancient stone architecture, sandstone temples, classical colonnades, traditional ancient tunics, robes, or historical armor. ABSOLUTELY NO modern cars, NO modern asphalt, NO skyscrapers, NO contemporary clothing, NO smartphones, NO electricity.',
    negative: 'modern cars, asphalt road, modern buildings, skyscraper, neon, electricity, smartphone, jeans, hoodie, t-shirt, modern suit, sneakers'
  },

  // 5. THỜI CHIẾN TRANH CẬN ĐẠI
  wartime_history: {
    key: 'wartime_history',
    isPreHuman: false,
    label: 'Thời Chiến Tranh / Cận Đại (Thế chiến, trận địa, quân sự)',
    directive: 'STRICT TIME ERA — HISTORIC WARTIME ERA (Early-to-Mid 20th Century): Period-accurate vintage military uniforms, canvas field gear, muddy battlefield trenches, vintage military equipment, historic bombed terrain. ABSOLUTELY NO contemporary futuristic gear, NO modern smartphones.',
    negative: 'smartphone, modern sports car, futuristic sci-fi armor, contemporary casual clothes'
  },

  // 6. TƯƠNG LAI VIỄN TƯỞNG
  futuristic_scifi: {
    key: 'futuristic_scifi',
    isPreHuman: false,
    label: 'Tương Lai / Viễn Tưởng (Sci-Fi, Sao Hỏa, 250 triệu năm nữa)',
    directive: 'STRICT TIME ERA — FAR FUTURE / SCI-FI PLANETARY ERA: High-tech pressurized exploration suits, futuristic planetary biodomes, Martian red regolith, or extreme post-continental terraformed wilderness of the far future. Futuristic aesthetic.',
    negative: 'contemporary 20th century cars, vintage medieval architecture, ancient ruins, ordinary modern office'
  },

  // 7. THỜI HIỆN ĐẠI & ĐỜI SỐNG (MẶC ĐỊNH)
  modern_contemporary: {
    key: 'modern_contemporary',
    isPreHuman: false,
    label: 'Thời Hiện Đại & Đời Sống (Công nghệ, văn phòng, phố xá)',
    directive: 'STRICT TIME ERA — CONTEMPORARY MODERN ERA: Relatable everyday modern world, contemporary clothing, digital devices, modern workspaces, or modern city life.',
    negative: 'ancient toga, prehistoric fur, dinosaur, medieval armor'
  }
};

/**
 * Tự động nhận diện mốc thời gian từ văn bản kịch bản/chủ đề hoặc lấy theo lựa chọn của người dùng.
 * Thứ tự ưu tiên:
 * 1. THỜI KỲ TRÁI ĐẤT SƠ KHAI / TIỀN SINH (Hàng trăm triệu - tỷ năm trước)
 * 2. THỜI KHỦNG LONG (66 - 250 triệu năm trước)
 * 3. KỶ BĂNG HÀ & NGƯỜI TIỀN SỬ
 * 4. TƯƠNG LAI VIỄN TƯỞNG
 * 5. THỜI CHIẾN TRANH
 * 6. CỔ ĐẠI VĂN MINH CON NGƯỜI (chỉ bắt các từ khoá văn minh loài người cụ thể)
 * 7. HIỆN ĐẠI
 */
export function detectTimeEra({ explicitEra, title = '', scenario = '', fullText = '' }) {
  if (explicitEra && explicitEra !== 'auto' && TIME_ERAS[explicitEra]) {
    return TIME_ERAS[explicitEra];
  }

  const corpus = `${title} ${scenario} ${fullText}`.toLowerCase();

  // 1. TRÁI ĐẤT TIỀN SINH & ĐỊA CẦU SƠ KHAI (CHƯA CÓ CON NGƯỜI) - ƯU TIÊN SỐ 1
  // Bao gồm: Băng Hà Tuyết Cầu (Snowball Earth), Trái Đất sơ khai, hàng trăm triệu đến tỷ năm trước,
  // lòng đất sâu 600km, lõi Trái Đất, kiến tạo mảng, đại dương nguyên sinh, đại tuyệt chủng cổ sinh.
  if (
    /(tuyết\s*cầu|snowball\s*earth|hành\s*tinh\s*đóng\s*băng|quả\s*cầu\s*băng|băng\s*hà\s*toàn\s*cầu|cryogenian|huronian|sturtian|marinoan)/i.test(corpus) ||
    /(đại\s*dương\s*ngầm|lớp\s*phủ\s*manti|mantle|ringwoodite|600km|lõi\s*trong\s*trái\s*đất|lõi\s*trái\s*đất|earth's\s*core|hố\s*khoan\s*kola|rãnh\s*mariana|mariana\s*trench|dị\s*thường\s*nam\s*đại\s*tây\s*dương|đảo\s*cực\s*địa\s*từ|geomagnetic\s*reversal)/i.test(corpus) ||
    /(vụ\s*nổ\s*lớn|big\s*bang|trước\s*big\s*bang|theia|khai\s*sinh\s*mặt\s*trăng|giant\s*impact|mặt\s*trời\s*biến\s*mất)/i.test(corpus) ||
    /(đại\s*oxy\s*hóa|oxy\s*hóa\s*lớn|great\s*oxidation|great\s*oxygenation|hadean|archean|proterozoic|tiền\s*cambri|precambrian|kỷ\s*cambri|kỷ\s*cambria|cambrian|kỷ\s*ordovic|kỷ\s*silur|kỷ\s*devon|kỷ\s*than\s*đá|carboniferous|tuyệt\s*chủng\s*permi|permian\s*extinction|tuyệt\s*chủng\s*hàng\s*loạt|rodinia|columbia|siêu\s*lục\s*địa|trái\s*đất\s*sơ\s*khai|sơ\s*khai\s*của\s*trái\s*đất|trái\s*đất\s*nguyên\s*thủy|khí\s*quyển\s*nguyên\s*thủy|biển\s*nguyên\s*sinh|trái\s*đất\s*màu\s*tím|purple\s*earth)/i.test(corpus) ||
    // Hàng trăm triệu đến tỷ năm trước (chắc chắn chưa có con người)
    /(\b\d+\s*(tỷ|tỉ)\s*năm|\b\d+\s*billion\s*years|hàng\s*(tỷ|tỉ)\s*năm)/i.test(corpus) ||
    (/(\b\d+\s*triệu\s*năm|\b\d+\s*million\s*years|hàng\s*(trăm\s*)?triệu\s*năm)/i.test(corpus) &&
      !/(người\s*tiền\s*sử|người\s*tối\s*cổ|homo\s*sapiens|neanderthal|kỷ\s*băng\s*hà)/i.test(corpus) &&
      !/(chicxulub|khủng\s*long|dinosaur|cretaceous|jurassic|triassic|t-rex)/i.test(corpus))
  ) {
    return TIME_ERAS.prehuman_primordial_earth;
  }

  // 2. THỜI KHỦNG LONG / ĐẠI TRUNG SINH (CHƯA CÓ CON NGƯỜI) - ƯU TIÊN SỐ 2
  if (/(chicxulub|khủng\s*long|dinosaur|cretaceous|jurassic|triassic|t-rex|tyrannosaurus|sauropod|pterosaur|velociraptor|k-pg|k-t\s*extinction|66\s*triệu\s*năm|66\s*million|mesozoic|đại\s*trung\s*sinh|tiểu\s*hành\s*tinh\s*va\s*chạm\s*xóa\s*sổ|xóa\s*sổ\s*khủng\s*long|dinosaur-killing)/i.test(corpus)) {
    return TIME_ERAS.prehistoric_dinosaurs;
  }

  // 3. KỶ BĂNG HÀ & NGƯỜI TIỀN SỬ (ĐÃ CÓ NGƯỜI TIỀN SỬ / MẶC DA THÚ)
  if (/(kỷ\s*băng\s*hà|ice\s*age|người\s*tiền\s*sử|người\s*tối\s*cổ|vượn\s*người|neanderthal|homo\s*sapiens|ma\s*mút|mammoth|thời\s*đồ\s*đá|đồ\s*đá|paleolithic|stone\s*age|lửa\s*tiền\s*sử|săn\s*bắt\s*hái\s*lượm|hang\s*động\s*tiền\s*sử|caveman|đôi\s*giày\s*đầu\s*tiên|săn\s*voi\s*ma\s*mút)/i.test(corpus)) {
    return TIME_ERAS.ice_age_paleolithic;
  }

  // 4. TƯƠNG LAI / VIỄN TƯỞNG
  if (/(sao\s*hỏa|định\s*cư\s*sao\s*hỏa|mars\s*colony|living\s*on\s*mars|250\s*triệu\s*năm\s*nữa|pangea\s*ultima|nghìn\s*tỷ\s*năm|trillion-year|tương\s*lai\s*viễn\s*tưởng|sci-fi|cyberpunk|robot\s*thống\s*trị|tàu\s*mẹ\s*vũ\s*trụ)/i.test(corpus)) {
    return TIME_ERAS.futuristic_scifi;
  }

  // 5. THỜI CHIẾN TRANH CẬN ĐẠI
  if (/(thế\s*chiến|world\s*war|chiến\s*hào|trench\s*warfare|1914|1918|1939|1945|phát\s*xít|quân\s*đội\s*thế\s*chiến|bom\s*nguyên\s*tử|hiroshima|nagasaki|chiến\s*tranh\s*lạnh|cold\s*war)/i.test(corpus)) {
    return TIME_ERAS.wartime_history;
  }

  // 6. CỔ ĐẠI & PHONG KIẾN LOÀI NGƯỜI (chỉ bắt các danh từ văn minh loài người cụ thể, tuyệt đối tránh nhầm "Trái Đất cổ đại")
  if (/(ai\s*cập\s*cổ\s*đại|ancient\s*egypt|pharaoh|kim\s*tự\s*tháp|hy\s*lạp\s*cổ|la\s*mã\s*cổ\s*đại|ancient\s*rome|ancient\s*greece|spartan|gladiator|đấu\s*sĩ\s*la\s*mã|samurai|ninja|tam\s*quốc|hoàng\s*đế\s*trung\s*hoa|tần\s*thủy\s*hoàng|sekigahara|sengoku|shogun|edo|vương\s*triều\s*phong\s*kiến|hiệp\s*sĩ\s*trung\s*cổ|medieval\s*knight|lâu\s*đài\s*trung\s*cổ)/i.test(corpus)) {
    return TIME_ERAS.ancient_civilization;
  }

  // Mặc định: Hiện đại
  return TIME_ERAS.modern_contemporary;
}
