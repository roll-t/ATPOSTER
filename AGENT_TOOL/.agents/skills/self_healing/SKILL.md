---
name: Self-Healing AI Agent Diagnostics
description: Tự động phát hiện, phân tích và vá lỗi mã nguồn từ nhật ký lỗi hệ thống (diagnostics) trong MongoDB.
---

# Hướng dẫn Kích hoạt và Vận hành Tự vá lỗi (Self-Healing)

Khi người dùng yêu cầu kiểm tra lỗi hệ thống hoặc tự động sửa lỗi (Self-Healing/Troubleshooting), hãy thực thi theo quy trình chuẩn hóa sau:

## Bước 1: Quét danh sách lỗi hệ thống
1. Chạy mã kịch bản chẩn đoán hoặc đọc bộ sưu tập `diagnostics` trong MongoDB để tìm các lỗi có trạng thái `status: "unresolved"`.
   - Bạn có thể chạy lệnh `node scripts/show_bugs.js` để in nhanh danh sách lỗi ra màn hình terminal.

## Bước 2: Phân tích nguyên nhân và khoanh vùng tệp tin lỗi
1. Xác định tệp tin gặp sự cố từ trường `filePath` và bối cảnh xảy ra từ trường `context` (ví dụ: `postId`, `accountId`).
2. Đọc nội dung tệp tin nguồn tương ứng sử dụng công cụ đọc tệp `view_file`.
3. Xem xét dòng thông báo lỗi `message` và nhật ký ngăn xếp `stack` để hiểu rõ tại sao lỗi xảy ra (ví dụ: lỗi Timeout, lỗi cú pháp, lỗi kết nối mạng, phần tử giao diện thay đổi...).

## Bước 3: Thực hiện vá lỗi tự động
1. Lập kế hoạch sửa lỗi cụ thể cho tệp tin đích.
2. Sử dụng công cụ sửa tệp `replace_file_content` hoặc `multi_replace_file_content` để áp dụng bản vá lỗi vào mã nguồn.
3. Luôn bảo toàn các bình luận và cấu trúc mã nguồn không liên quan của hệ thống.

## Bước 4: Kiểm thử và Biên dịch lại hệ thống
1. Chạy lệnh `npm run build` hoặc chạy thử các bài kiểm thử liên quan để đảm bảo bản vá lỗi không gây ra lỗi cú pháp hay phá vỡ hệ thống.
2. Nếu quá trình biên dịch thất bại, hãy quay lại bước phân tích để điều chỉnh bản vá.

## Bước 5: Đánh dấu Đã Khắc Phục (Resolved)
1. Cập nhật trạng thái của bản ghi lỗi trong bộ sưu tập `diagnostics` của MongoDB:
   - Thay đổi `status` thành `"resolved"`.
   - Đặt `resolvedAt` thành thời gian hiện tại (`new Date().toISOString()`).
2. Báo cáo chi tiết nguyên nhân, cách xử lý và kết quả kiểm tra cho người dùng.
