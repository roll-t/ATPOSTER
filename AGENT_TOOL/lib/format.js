// Tiện ích định dạng số liệu dùng chung cho các trang thống kê

export function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString('vi-VN');
}

export function formatTime(isoStr) {
  if (!isoStr) return 'Chưa cập nhật';
  const date = new Date(isoStr);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('vi-VN');
}

export function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('vi-VN');
}
