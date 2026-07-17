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

    // Gửi định kỳ mỗi 2.5 giây
    const interval = setInterval(sendHeartbeat, 2500);

    return () => clearInterval(interval);
  }, []);

  return null;
}
