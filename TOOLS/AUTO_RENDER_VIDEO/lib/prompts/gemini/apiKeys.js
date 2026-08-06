/**
 * Tách chuỗi cấu hình API Key (có thể chứa nhiều key, mỗi key 1 dòng hoặc cách
 * nhau bằng dấu phẩy) thành mảng các key hợp lệ, đã loại bỏ khoảng trắng và mục rỗng.
 */
export function parseApiKeys(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(/[\n,]+/);
  return list.map((key) => (key || '').trim()).filter(Boolean);
}
