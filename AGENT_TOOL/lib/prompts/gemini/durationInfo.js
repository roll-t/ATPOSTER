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
    default:
      return { label: 'Dưới 1 phút (Mặc định)', targetSeconds: 45, segmentsCount: '8 đến 12' };
  }
}
