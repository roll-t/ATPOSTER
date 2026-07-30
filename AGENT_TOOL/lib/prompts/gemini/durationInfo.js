/**
 * Trả về thông tin mô tả chi tiết thời lượng theo mã lựa chọn
 */
export function getDurationInfo(durationRange) {
  switch (durationRange) {
    case 'under_1m':
      return { label: 'Dưới 1 phút', targetSeconds: 45, segmentsCount: '8 đến 12' };
    case '1_2m':
      return { label: 'Từ 1 - 2 phút', targetSeconds: 90, segmentsCount: '15 đến 25' };
    case '2_3m':
      return { label: 'Từ 2 - 3 phút', targetSeconds: 150, segmentsCount: '28 đến 45' };
    case '3_4m':
      return { label: 'Từ 3 - 4 phút', targetSeconds: 210, segmentsCount: '45 đến 60' };
    // Các mốc "video dài" — hiện chỉ được chọn từ giao diện của skill "Video Nói Chuyện Đạo Lý"
    // (moral_talk_slideshow, xem ContentForm.js) khi chọn Dạng ngang 16:9, vì đó là chủ đề đầu
    // tiên cần thời lượng dài hơn 3-4 phút thật sự (video YouTube ngang, không phải short dọc).
    // Vẫn khai báo đủ cả label/targetSeconds/segmentsCount ở đây (không chỉ riêng cho category
    // đó) để nếu category khác sau này lỡ dùng tới giá trị này, prompt vẫn ra đúng thời lượng
    // thay vì rơi về nhánh `default` (Dưới 1 phút) một cách âm thầm và sai lệch hoàn toàn.
    case '4_6m':
      return { label: 'Từ 4 - 6 phút', targetSeconds: 300, segmentsCount: '28 đến 40' };
    case '6_8m':
      return { label: 'Từ 6 - 8 phút', targetSeconds: 420, segmentsCount: '38 đến 54' };
    case '8_10m':
      return { label: 'Từ 8 - 10 phút', targetSeconds: 540, segmentsCount: '48 đến 68' };
    default:
      return { label: 'Dưới 1 phút (Mặc định)', targetSeconds: 45, segmentsCount: '8 đến 12' };
  }
}
