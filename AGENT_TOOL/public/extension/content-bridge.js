console.log('[Flow Helper Extension] Bridge script loaded successfully.');

// --- Đồng bộ ngược trạng thái hàng đợi (flowQueue) cho trang Web để hiển thị tiến độ chạy
// (chưa bắt đầu / đang chạy n trên tổng / hoàn thành) ngay trên nút "Đẩy sang...".
function broadcastQueueState() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
  chrome.storage.local.get(['flowQueue', 'autoRunActive'], (result) => {
    window.postMessage({
      type: 'FLOW_QUEUE_STATE',
      queue: result.flowQueue || null,
      autoRunActive: result.autoRunActive === true
    }, '*');
  });
}

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.flowQueue || changes.autoRunActive) {
      broadcastQueueState();
    }
  });
}

// Gửi trạng thái ngay khi trang tải xong (extension nạp trước hay sau trang đều không sao,
// vì trang có thể chủ động hỏi lại qua REQUEST_FLOW_QUEUE_STATE bên dưới)
broadcastQueueState();

// Lắng nghe thông điệp từ trang Web (AutoPoster Dashboard)
window.addEventListener('message', (event) => {
  // Chỉ nhận thông điệp từ chính trang web
  if (event.source !== window) return;

  if (event.data && event.data.type === 'REQUEST_FLOW_QUEUE_STATE') {
    broadcastQueueState();
    return;
  }

  if (event.data && event.data.type === 'START_FLOW_GENERATION') {
    const { segments, title, isImage, folderPath, imageExt, orientation } = event.data;
    console.log('[Flow Helper Extension] Đã nhận kịch bản từ App:', title);
    
    // Hàm loại bỏ phần tiếng Việt sau ký tự " // "
    function stripVietnamese(text) {
      if (typeof text !== 'string') return text;
      return text.split('\n').map(line => {
        const parts = line.split(' // ');
        if (parts.length > 1) {
          return parts[0].trim();
        }
        return line;
      }).join('\n');
    }

    const cleanSegments = (segments || []).map(s => ({
      ...s,
      textPrompt: stripVietnamese(s.textPrompt || s.visualDescription || '')
    }));

    // Gửi thông tin sang Background Service Worker với kiểm tra an toàn kết nối
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'START_QUEUE',
          payload: {
            segments: cleanSegments,
            title,
            isImage: isImage === true,
            folderPath: folderPath || 'example',
            imageExt: imageExt || 'jpg',
            orientation: orientation === 'landscape' ? 'landscape' : 'portrait'
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Flow Helper Extension] Lỗi gửi thông điệp:', chrome.runtime.lastError);
            alert('⚠️ Lỗi kết nối Tiện ích. Vui lòng tải lại trang (F5) để đồng bộ lại!');
          } else {
            console.log('[Flow Helper Extension] Đã lưu hàng đợi kịch bản thành công.');
          }
        });
      } else {
        alert('⚠️ Tiện ích mở rộng đã được nạp lại. Vui lòng tải lại (F5) trang web này để tái kết nối tiện ích!');
      }
    } catch (err) {
      console.error('[Flow Helper Extension] Exception:', err);
      alert('⚠️ Tiện ích mở rộng đã bị nạp lại bởi trình duyệt Chrome. Vui lòng nhấn F5 tải lại trang web này!');
    }
  }
});
