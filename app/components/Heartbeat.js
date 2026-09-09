'use client';

import { useEffect } from 'react';

export default function Heartbeat() {
  useEffect(() => {
    // Chỉ chạy trong môi trường client
    if (typeof window === 'undefined') return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/heartbeat', { method: 'POST' });
      } catch (err) {
        // Bỏ qua lỗi kết nối tạm thời khi server chưa phản hồi
      }
    };

    // Gửi heartbeat lập tức khi mở trang
    sendHeartbeat();

    // Gửi định kỳ mỗi 30 giây (server chỉ tắt nếu không có tab nào trong 30 phút)
    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
