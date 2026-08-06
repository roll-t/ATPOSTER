import { readDb } from './db.js';

// ==========================================================================
// Thuật toán đề xuất lịch đăng tự động cho YouTube Shorts.
//
// Mục tiêu: tối ưu khả năng viral (đăng vào khung giờ nhiều người xem nhất) đồng thời
// tránh các dấu hiệu khiến YouTube nghi ngờ tài khoản đang bị vận hành tự động hàng loạt
// (spam/bot), vốn là nguyên nhân phổ biến khiến kênh bị hạn chế hoặc khóa:
//   1. Giới hạn số video/ngày AN TOÀN cho mỗi kênh (thấp hơn nhiều so với giới hạn kỹ thuật
//      của YouTube) — đăng quá nhiều video/ngày trên 1 kênh là dấu hiệu spam rõ rệt nhất.
//   2. Khoảng cách tối thiểu giữa 2 lần đăng của CÙNG 1 kênh — tránh đăng dồn dập.
//   3. Khoảng cách tối thiểu giữa lịch đăng của TẤT CẢ kênh trong hệ thống — vì nhiều kênh
//      chạy chung 1 máy/1 IP, nếu nhiều kênh cùng đăng đúng 1 thời điểm sẽ tạo dấu hiệu
//      "mạng lưới kênh tự động" (coordinated inauthentic behavior).
//   4. Ưu tiên khung giờ vàng (giờ Việt Nam) có lượng người xem Shorts cao nhất, tránh
//      khung giờ rạng sáng vừa ít người xem thật vừa trông giống hành vi máy móc.
//   5. Thêm nhiễu ngẫu nhiên (jitter) để giờ đăng không lặp lại y hệt mỗi ngày.
// ==========================================================================

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const MAX_POSTS_PER_DAY_PER_ACCOUNT = 4;   // Giới hạn an toàn/kênh/ngày (thấp hơn giới hạn kỹ thuật của YouTube)
const MIN_GAP_HOURS_SAME_ACCOUNT = 4;      // Khoảng cách tối thiểu giữa 2 video CÙNG kênh
const MIN_GAP_MINUTES_GLOBAL = 6;          // Khoảng cách tối thiểu giữa BẤT KỲ 2 lịch đăng nào trong hệ thống
const JITTER_MINUTES = 12;                 // Biến thiên ngẫu nhiên quanh mốc giờ được chọn
const CANDIDATE_STEP_MS = 20 * 60 * 1000;  // Bước dò tìm mốc giờ ứng viên trong khung giờ vàng
const MAX_DAYS_LOOKAHEAD = 14;             // Số ngày tối đa được phép tìm lịch trước khi báo lỗi

// Khung giờ vàng cho Shorts (giờ Việt Nam) - dựa trên khoảng thời gian người xem hoạt động nhiều nhất
const PEAK_WINDOWS = [
  { startHour: 11, startMinute: 0, endHour: 13, endMinute: 30, label: 'khung giờ trưa' },
  { startHour: 18, startMinute: 0, endHour: 22, endMinute: 30, label: 'khung giờ tối' }
];

// Quy đổi 1 thời điểm UTC sang các thành phần ngày-giờ theo giờ Việt Nam (UTC+7, không có giờ mùa hè)
function toVnParts(date) {
  const vnDate = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    year: vnDate.getUTCFullYear(),
    month: vnDate.getUTCMonth(),
    day: vnDate.getUTCDate()
  };
}

// Tạo thời điểm UTC thực tương ứng với 1 mốc ngày-giờ theo giờ Việt Nam
function vnDateAt(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month, day, hour, minute) - VN_OFFSET_MS);
}

// Dịch (year, month, day) theo giờ VN thêm offsetDays ngày, trả về thành phần ngày-giờ VN mới
function addDaysVn(year, month, day, offsetDays) {
  const base = vnDateAt(year, month, day, 12, 0); // lấy giữa trưa để tránh lệch ngày do làm tròn
  return toVnParts(new Date(base.getTime() + offsetDays * 24 * 60 * 60 * 1000));
}

/**
 * Tính toán thời điểm đăng bài được đề xuất cho 1 tài khoản.
 * @param {string} accountId
 * @returns {Promise<{ scheduledAt: string, reason: string }>}
 */
export async function recommendScheduleSlot(accountId) {
  const db = await readDb();
  const account = db.accounts.find(a => a.id === accountId);
  if (!account) {
    throw new Error('Không tìm thấy tài khoản.');
  }

  const now = new Date();
  // Chỉ tính đến các bài đang chờ/đang xử lý/đã đăng thành công - bỏ qua bài lỗi (không chiếm slot thật)
  const activePosts = db.posts.filter(p => p.status === 'pending' || p.status === 'processing' || p.status === 'success');

  // Nếu kênh đang bị YouTube giới hạn đăng tải hằng ngày, bắt đầu tính từ lúc giới hạn được gỡ
  let earliestAllowed = now;
  if (account.uploadLimitReachedAt) {
    const cooldownEnd = new Date(new Date(account.uploadLimitReachedAt).getTime() + 24 * 60 * 60 * 1000);
    if (cooldownEnd > earliestAllowed) earliestAllowed = cooldownEnd;
  }

  const startParts = toVnParts(earliestAllowed);

  for (let dayOffset = 0; dayOffset < MAX_DAYS_LOOKAHEAD; dayOffset++) {
    const parts = dayOffset === 0
      ? startParts
      : addDaysVn(startParts.year, startParts.month, startParts.day, dayOffset);

    // Đếm số bài của kênh này đã có trong ngày đang xét (theo giờ VN)
    const postsThisDay = activePosts.filter(p => {
      if (p.accountId !== accountId) return false;
      const refTime = p.scheduledAt || p.postedAt || p.createdAt;
      if (!refTime) return false;
      const vp = toVnParts(new Date(refTime));
      return vp.year === parts.year && vp.month === parts.month && vp.day === parts.day;
    });

    if (postsThisDay.length >= MAX_POSTS_PER_DAY_PER_ACCOUNT) {
      continue; // Kênh đã đủ số lượng an toàn trong ngày này, xét sang ngày kế tiếp
    }

    for (const window of PEAK_WINDOWS) {
      const windowStart = vnDateAt(parts.year, parts.month, parts.day, window.startHour, window.startMinute);
      const windowEnd = vnDateAt(parts.year, parts.month, parts.day, window.endHour, window.endMinute);

      for (let t = windowStart.getTime(); t <= windowEnd.getTime(); t += CANDIDATE_STEP_MS) {
        const baseCandidate = new Date(t);
        if (baseCandidate < earliestAllowed) continue;

        // Khoảng cách với các bài khác của CÙNG kênh
        const tooCloseToSameAccount = postsThisDay.some(p => {
          const refTime = p.scheduledAt || p.postedAt || p.createdAt;
          const diffHours = Math.abs(baseCandidate.getTime() - new Date(refTime).getTime()) / 3600000;
          return diffHours < MIN_GAP_HOURS_SAME_ACCOUNT;
        });
        if (tooCloseToSameAccount) continue;

        // Khoảng cách với TẤT CẢ lịch đăng khác trong toàn hệ thống (mọi kênh)
        const tooCloseGlobally = activePosts.some(p => {
          const refTime = p.scheduledAt || p.postedAt;
          if (!refTime) return false;
          const diffMinutes = Math.abs(baseCandidate.getTime() - new Date(refTime).getTime()) / 60000;
          return diffMinutes < MIN_GAP_MINUTES_GLOBAL;
        });
        if (tooCloseGlobally) continue;

        // Thêm nhiễu ngẫu nhiên để giờ đăng không lặp lại y hệt mỗi lần tính
        const jitterMs = (Math.random() * 2 - 1) * JITTER_MINUTES * 60 * 1000;
        let finalCandidate = new Date(baseCandidate.getTime() + jitterMs);
        if (finalCandidate < earliestAllowed) finalCandidate = new Date(earliestAllowed.getTime() + 60000);

        const dayLabel = dayOffset === 0 ? 'hôm nay' : dayOffset === 1 ? 'ngày mai' : `${dayOffset} ngày nữa`;
        const reason = `Kênh đã có ${postsThisDay.length}/${MAX_POSTS_PER_DAY_PER_ACCOUNT} video ${dayLabel}. Đã chọn ${window.label} (giờ vàng cho Shorts), cách lịch đăng khác của kênh này tối thiểu ${MIN_GAP_HOURS_SAME_ACCOUNT} giờ và cách lịch đăng của các kênh khác tối thiểu ${MIN_GAP_MINUTES_GLOBAL} phút để tránh trông như đăng hàng loạt.`;

        return { scheduledAt: finalCandidate.toISOString(), reason };
      }
    }
  }

  throw new Error(`Không tìm được khung giờ phù hợp trong ${MAX_DAYS_LOOKAHEAD} ngày tới (lịch đăng hiện đang quá dày). Hãy thử lại sau hoặc chọn kênh khác.`);
}
