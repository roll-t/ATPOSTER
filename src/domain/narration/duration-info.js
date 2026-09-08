/**
 * Trả về thông tin mô tả chi tiết thời lượng theo mã lựa chọn
 */
export function getDurationInfo(durationRange) {
  switch (durationRange) {
    case 'under_1m':
      return { label: 'Dưới 1 phút', targetSeconds: 50, segmentsCount: '16 đến 22' };
    case '1_2m':
      return { label: 'Từ 1 - 2 phút', targetSeconds: 100, segmentsCount: '26 đến 36' };
    case '2_3m':
      return { label: 'Từ 2 - 3 phút', targetSeconds: 160, segmentsCount: '42 đến 56' };
    case '3_4m':
      return { label: 'Từ 3 - 4 phút', targetSeconds: 220, segmentsCount: '60 đến 80' };
    // Các mốc "video dài" — hiện chỉ được chọn từ giao diện của skill "Video Nói Chuyện Đạo Lý"
    // (moral_talk_slideshow, xem ContentForm.js) khi chọn Dạng ngang 16:9, vì đó là chủ đề đầu
    // tiên cần thời lượng dài hơn 3-4 phút thật sự (video YouTube ngang, không phải short dọc).
    // Vẫn khai báo đủ cả label/targetSeconds/segmentsCount ở đây (không chỉ riêng cho category
    // đó) để nếu category khác sau này lỡ dùng tới giá trị này, prompt vẫn ra đúng thời lượng
    // thay vì rơi về nhánh `default` (Dưới 1 phút) một cách âm thầm và sai lệch hoàn toàn.
    case '4_6m':
      return { label: 'Từ 4 - 6 phút', targetSeconds: 300, segmentsCount: '80 đến 105' };
    case '6_8m':
      return { label: 'Từ 6 - 8 phút', targetSeconds: 420, segmentsCount: '115 đến 145' };
    case '8_10m':
      // 150-180 là nhịp của các skill slideshow nhanh (moral_talk_slideshow) — mỗi slide 3-4 giây.
      return { label: 'Từ 8 - 10 phút', targetSeconds: 540, segmentsCount: '150 đến 180' };
    // Hai mốc dài dưới đây hiện chỉ có skill buddhist_wisdom dùng (10 giây/ảnh), nên segmentsCount
    // để theo nhịp đó. Skill nào muốn mở 2 mốc này phải tự khai số slide của mình trước.
    case '10_15m':
      return { label: 'Từ 10 - 15 phút', targetSeconds: 750, segmentsCount: '35 đến 45' };
    case '15_20m':
      return { label: 'Từ 15 - 20 phút', targetSeconds: 1050, segmentsCount: '45 đến 60' };
    default:
      return { label: 'Dưới 1 phút (Mặc định)', targetSeconds: 50, segmentsCount: '16 đến 22' };
  }
}
