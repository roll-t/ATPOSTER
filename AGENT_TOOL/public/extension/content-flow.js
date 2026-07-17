// --- Google Flow Video Helper Content Script ---

let queue = null;
let autoRun = false;
let autoRunTimeout = null;
let currentRunId = null;
let sidebarEl = null;
let isCollapsed = false;
let currentGenerationBaseline = null; // Ảnh có sẵn trước lần gửi gần nhất (dùng để nhận diện ảnh mới)

// Kiểm tra xem context của extension còn "sống" không. Khi extension được reload (chrome://extensions)
// trong lúc tab Flow cũ vẫn còn mở, content script cũ trở thành "zombie" - chrome.runtime.id sẽ là
// undefined - mọi lệnh gọi chrome.storage/chrome.runtime sau đó sẽ ném lỗi "Extension context invalidated".
// Dùng hàm này để các vòng lặp tự phát hiện và dừng sạch thay vì spam lỗi vô hạn cho tới khi tab bị đóng/tải lại.
function isExtensionAlive() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// QUAN TRỌNG: `queue` bị GÁN LẠI thành 1 object HOÀN TOÀN MỚI mỗi khi chrome.storage.onChanged
// bắn ra (kể cả khi CHÍNH content script này vừa tự ghi storage - Chrome không lọc "tự thay đổi").
// Các luồng xử lý dài hạn (waitForCompletionAndDownload, runAutoLoop...) giữ 1 tham chiếu `segment`
// được "chụp" từ đầu, kéo dài qua nhiều giây/phút polling - trong lúc đó `queue` gần như chắc chắn
// đã bị gán lại ít nhất 1 lần, khiến `segment` cũ bị TÁCH RỜI khỏi mảng `queue.segments` thật.
// Nếu cứ mutate thẳng vào `segment` cũ rồi gọi saveQueueState(), thay đổi sẽ bị ghi vào 1 object
// "chết" trong khi saveQueueState() lại lưu `queue` hiện tại (vẫn giữ nguyên trạng thái cũ) -
// khiến status không bao giờ thực sự được cập nhật dù thao tác (vd lưu ảnh) đã thành công thật.
// => Luôn lấy lại đúng segment "sống" theo segmentNumber từ `queue` HIỆN TẠI trước khi ghi.
function getLiveSegment(segmentNumber) {
  return (queue && Array.isArray(queue.segments)) ? queue.segments.find(s => s.segmentNumber === segmentNumber) : null;
}

function updateSegmentStatus(segmentNumber, status) {
  const liveSegment = getLiveSegment(segmentNumber);
  if (!liveSegment) {
    console.warn('[Flow Helper] Không tìm thấy phân đoạn #', segmentNumber, 'trong hàng đợi hiện tại để cập nhật trạng thái (queue có thể đã đổi) - bỏ qua.');
    return null;
  }
  liveSegment.status = status;
  saveQueueState();
  renderSidebar();
  return liveSegment;
}

// Hàm đệ quy tìm kiếm element trên toàn bộ DOM (bao gồm cả các Shadow Roots)
function findElementInShadows(root, selectorPredicate) {
  if (!root) return null;

  if (root.nodeType === Node.ELEMENT_NODE && selectorPredicate(root)) {
    return root;
  }

  // Kiểm tra shadow root nếu có
  if (root.shadowRoot) {
    const found = findElementInShadows(root.shadowRoot, selectorPredicate);
    if (found) return found;
  }

  // Duyệt qua tất cả các con
  const children = root.childNodes || [];
  for (const child of children) {
    const found = findElementInShadows(child, selectorPredicate);
    if (found) return found;
  }

  return null;
}

// Tự động click tạo dự án mới nếu đang ở trang chủ dashboard của Google Flow
function handleDashboardAutoCreate() {
  const currentUrl = window.location.href;
  if (currentUrl.endsWith('/flow') || currentUrl.endsWith('/flow/') || currentUrl.includes('/flow/project') && !currentUrl.split('/project/')[1]) {
    console.log('[Flow Helper] Đang ở trang chủ Google Flow. Tìm nút tạo Dự án mới (bao gồm Shadow DOM)...');

    const matchesText = (el) => {
      const text = (el.textContent || el.innerText || '').trim();
      return text.includes('Dự án mới') || text.toLowerCase().includes('dự án mới') || text.includes('New project');
    };

    // Tìm phần tử CỤ THỂ NHẤT (lá) chứa chữ "Dự án mới"/"New project" — không thể chỉ kiểm tra
    // "textContent chứa chữ này" vì document.body luôn chứa chữ đó ở đâu đó trên trang, khiến
    // findElementInShadows (duyệt tiền thứ tự, kiểm tra node hiện tại trước khi vào con) khớp
    // trúng chính document.body ngay từ đầu -> body.click() không làm gì cả, dashboard đứng yên.
    const textNode = findElementInShadows(document.body, (el) => {
      const hasHeight = el.offsetHeight > 0 || (el.getBoundingClientRect && el.getBoundingClientRect().height > 0);
      if (!hasHeight || !matchesText(el)) return false;

      const children = el.childNodes || [];
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE && matchesText(child)) return false;
      }
      return true;
    });

    if (!textNode) {
      console.log('[Flow Helper] Không tìm thấy chữ "Dự án mới" trên trang.');
      return;
    }

    // Từ phần tử lá đó, đi ngược lên tìm phần tử thật sự bấm được gần nhất (button/role=button/con trỏ tay)
    let clickTarget = textNode;
    let hops = 0;
    while (clickTarget && hops < 6) {
      const tag = clickTarget.tagName;
      const role = clickTarget.getAttribute ? clickTarget.getAttribute('role') : null;
      const cursor = clickTarget.nodeType === Node.ELEMENT_NODE ? getComputedStyle(clickTarget).cursor : '';
      if (tag === 'BUTTON' || tag === 'A' || role === 'button' || cursor === 'pointer') {
        break;
      }
      clickTarget = clickTarget.parentElement;
      hops++;
    }
    if (!clickTarget) clickTarget = textNode;

    console.log('[Flow Helper] Đã tìm thấy nút tạo Dự án mới. Đang tự động click...', clickTarget);
    clickTarget.click();
  }
}

// Chuyển chế độ Ảnh / Video trên Google Flow
function selectFlowMode(isImage) {
  console.log(`[Flow Helper] Đang tự động kiểm tra chế độ: ${isImage ? 'ẢNH' : 'VIDEO'}`);

  // 1. Tìm nút chọn chế độ đang hiển thị trên thanh công cụ dưới cùng
  // Nút này thường chứa chữ "Video" hoặc "Ảnh" / "Image"
  const currentPill = findElementInShadows(document.body, (el) => {
    const text = (el.textContent || el.innerText || '').trim().toLowerCase();
    const hasHeight = el.offsetHeight > 0 || (el.getBoundingClientRect && el.getBoundingClientRect().height > 0);
    const isClickable = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button';
    if (!isClickable || !hasHeight) return false;

    // Nút pill chọn chế độ thường chứa "video" hoặc "ảnh" / "image" kèm tỉ lệ hoặc số lượng (ví dụ: "Video 1x", "Ảnh 1x")
    return (text.includes('video') || text.includes('ảnh') || text.includes('image') || text.includes('hình ảnh')) &&
      !text.includes('nhân vật') && !text.includes('tác nhân') && !text.includes('cảnh');
  });

  if (!currentPill) {
    console.log('[Flow Helper] Không tìm thấy nút chọn chế độ (Pill).');
    return false;
  }

  const currentText = (currentPill.textContent || currentPill.innerText || '').toLowerCase();
  const isCurrentlyImage = currentText.includes('ảnh') || currentText.includes('image') || currentText.includes('hình ảnh');
  const isCurrentlyVideo = currentText.includes('video');

  // Nếu đã ở đúng chế độ, không cần làm gì cả
  if (isImage && isCurrentlyImage) {
    console.log('[Flow Helper] Đã ở đúng chế độ ẢNH.');
    return false;
  }
  if (!isImage && isCurrentlyVideo) {
    console.log('[Flow Helper] Đã ở đúng chế độ VIDEO.');
    return false;
  }

  console.log(`[Flow Helper] Chế độ hiện tại: ${currentText}. Cần chuyển sang: ${isImage ? 'ẢNH' : 'VIDEO'}`);

  // Click vào nút Pill để mở menu dropdown lựa chọn
  currentPill.click();

  // Chờ 300ms cho menu dropdown render ra, sau đó tìm và click vào option tương ứng
  setTimeout(() => {
    const targetText = isImage ? 'ảnh' : 'video';
    const optionBtn = findElementInShadows(document.body, (el) => {
      const text = (el.textContent || el.innerText || '').trim().toLowerCase();
      const hasHeight = el.offsetHeight > 0 || (el.getBoundingClientRect && el.getBoundingClientRect().height > 0);
      const isClickable = el.tagName === 'DIV' || el.tagName === 'BUTTON' || el.tagName === 'SPAN' || el.getAttribute('role') === 'option' || el.getAttribute('role') === 'menuitem';

      if (!hasHeight) return false;

      // Tìm phần tử trong menu chứa chữ "ảnh" hoặc "video" (nhưng không phải là chính nút Pill cũ)
      return text === targetText || text.includes(targetText) && el !== currentPill;
    });

    if (optionBtn) {
      console.log('[Flow Helper] Đã tìm thấy option để chuyển chế độ:', optionBtn.textContent.trim());
      optionBtn.click();
    } else {
      console.log('[Flow Helper] Không tìm thấy option chuyển chế độ trong menu.');
    }
  }, 300);

  return true;
}

// Ghi nhớ lại URL dự án Flow đang xem (nếu có), để lần sau bấm "Đẩy sang Google Flow" mà
// không còn tab Flow nào mở, hệ thống có thể mở thẳng lại dự án này thay vì trang dashboard
// trống (dashboard trống sẽ tự động bấm "Dự án mới", tạo ra 1 dự án khác không liên quan).
function trackCurrentProjectUrl() {
  const href = window.location.href;
  if (!href.includes('/project/')) return;

  try {
    chrome.storage.local.get(['lastFlowProjectUrl'], (result) => {
      if (chrome.runtime.lastError) return; // context đã bị hủy giữa chừng, bỏ qua lặng lẽ
      if (result.lastFlowProjectUrl !== href) {
        chrome.storage.local.set({ lastFlowProjectUrl: href });
      }
    });
  } catch (e) {
    // "Extension context invalidated" - bỏ qua, vòng lặp gọi hàm này sẽ tự dừng ở lần tiếp theo
  }
}

// Tải hàng đợi từ storage khi load trang
function init() {
  if (!window.location.href.includes('/flow')) {
    return;
  }

  // Tự động kích hoạt bấm nút Dự án mới
  handleDashboardAutoCreate();
  const checkDashboardInterval = setInterval(() => {
    if (!isExtensionAlive()) {
      clearInterval(checkDashboardInterval);
      return;
    }
    const currentUrl = window.location.href;
    if (currentUrl.endsWith('/flow') || currentUrl.endsWith('/flow/') || currentUrl.includes('/flow/project') && !currentUrl.split('/project/')[1]) {
      handleDashboardAutoCreate();
    } else {
      clearInterval(checkDashboardInterval);
    }
  }, 1500);

  // Theo dõi liên tục URL dự án (độc lập với interval ở trên, vì Google Flow là SPA nên
  // người dùng có thể chuyển sang dự án khác bất cứ lúc nào mà không tải lại trang). Tự dừng
  // hẳn nếu phát hiện extension đã được reload (context cũ đã chết) để không spam lỗi vô hạn.
  trackCurrentProjectUrl();
  const projectUrlInterval = setInterval(() => {
    if (!isExtensionAlive()) {
      clearInterval(projectUrlInterval);
      return;
    }
    trackCurrentProjectUrl();
  }, 3000);

  chrome.storage.local.get(['flowQueue', 'autoRunActive'], (result) => {
    if (result.flowQueue) {
      queue = result.flowQueue;
      const prevAutoRun = autoRun;
      autoRun = result.autoRunActive === true;
      console.log('[Flow Helper] Đã tải hàng đợi:', queue.title, 'AutoRun active:', autoRun);
      renderSidebar();

      // Đảm bảo ở đúng chế độ Ảnh/Video của Google Flow
      setTimeout(() => selectFlowMode(queue.isImage), 1000);

      if (autoRun) {
        // Chỉ khởi chạy phiên mới nếu chưa có phiên nào hoặc trạng thái chuyển từ false sang true
        if (!prevAutoRun || !currentRunId) {
          currentRunId = Date.now();
          setTimeout(() => runAutoLoop(currentRunId), 2500);
        }
      }
    } else {
      queue = null;
      console.log('[Flow Helper] Không có hàng đợi nào.');
      renderSidebar();
    }
  });
}

function runSegmentViaDebugger(segment, callback) {
  const inputEl = findInputField();
  if (!inputEl) {
    console.error('[Flow Helper] Không tìm thấy ô prompt.');
    if (callback) callback({ success: false, error: 'no_input' });
    return;
  }

  // Đảm bảo ở đúng chế độ trước khi điền
  const isSwitching = selectFlowMode(queue.isImage);
  const delay = isSwitching ? 1000 : 0;

  setTimeout(() => {
    // Tìm lại inputEl đề phòng DOM thay đổi sau khi chuyển chế độ
    const freshInput = findInputField() || inputEl;
    freshInput.focus();

    const r = freshInput.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);

    // Chụp lại các ảnh đang có TRƯỚC khi gửi, để sau này biết ảnh nào là ảnh MỚI Flow vừa vẽ ra
    const baselineSrcs = snapshotImageSrcs();
    const baselineErrorCount = getPolicyErrorNodes().length;

    chrome.runtime.sendMessage({
      action: 'DEBUG_SUBMIT',
      payload: {
        x,
        y,
        prompt: segment.textPrompt
      }
    }, (res) => {
      if (chrome.runtime.lastError) {
        console.error('[Flow Helper] Lỗi gửi tới background:', chrome.runtime.lastError);
        if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Flow Helper] Gõ & gửi kịch bản thành công:', res);
        if (callback) callback({ ...res, baselineSrcs, baselineErrorCount });
      }
    });
  }, delay);
}

// Theo dõi tiến trình sinh ảnh/video của Flow rồi tự động tải kết quả về khi xong
async function waitForCompletionAndDownload(segment, baselineSrcs, isAuto = false, runId = null, baselineErrorCount = 0, attempt = 0) {
  // Nếu extension đã được reload (context cũ đã chết), dừng lại ngay - không thử gọi
  // chrome.runtime/chrome.storage nữa để tránh ném lỗi "Extension context invalidated"
  // và (quan trọng nhất) để KHÔNG bỏ segment này ở trạng thái "processing" kẹt vĩnh viễn
  // một cách âm thầm - nó sẽ được người dùng "Đặt lại" và chạy lại sau khi F5 trang.
  if (!isExtensionAlive()) {
    console.warn('[Flow Helper] Extension context đã bị hủy (có thể do vừa reload) - dừng theo dõi phân đoạn', segment.segmentNumber);
    return;
  }

  // Nếu là chạy tự động hàng đợi, kiểm tra xem phiên chạy này có còn hợp lệ không
  if (isAuto && runId !== currentRunId) {
    console.log('[Flow Helper] Tiến trình chờ tải ảnh bị hủy vì đổi phiên chạy:', runId);
    return;
  }

  // Kiểm tra xem có lỗi vi phạm chính sách mới xuất hiện hay không
  if (getPolicyErrorNodes().length > baselineErrorCount) {
    console.error('[Flow Helper] Phát hiện câu lệnh vi phạm chính sách của Google Flow.');
    
    if (isAuto) {
      autoRun = false;
      currentRunId = null;
      chrome.storage.local.set({ autoRunActive: false });
    }
    
    updateSegmentStatus(segment.segmentNumber, 'pending');

    showToast('⚠️ Phát hiện câu lệnh vi phạm chính sách! Đã dừng.', 'error');
    
    chrome.runtime.sendMessage({
      action: 'SHOW_SYSTEM_NOTIFICATION',
      payload: {
        title: '⚠️ Lỗi Chính Sách Google Flow',
        message: `Phân đoạn #${segment.segmentNumber} bị chặn do vi phạm chính sách. Đã dừng để bạn điều chỉnh!`
      }
    });
    return;
  }

  // Nếu là chế độ hình ảnh, kiểm tra xem đã xuất hiện ảnh MỚI hoàn chỉnh hay chưa
  if (queue && queue.isImage) {
    const newImages = findNewGeneratedImages(baselineSrcs);
    if (newImages.length === 0) {
      if (attempt > 80) { // ~4 phút, tránh treo vô hạn nếu Flow lỗi
        console.warn('[Flow Helper] Quá thời gian chờ tạo ảnh cho phân đoạn', segment.segmentNumber, '- dừng theo dõi.');
        updateSegmentStatus(segment.segmentNumber, 'completed');
        if (isAuto && autoRun && runId === currentRunId) {
          runAutoLoop(runId);
        }
        return;
      }
      setTimeout(() => waitForCompletionAndDownload(segment, baselineSrcs, isAuto, runId, baselineErrorCount, attempt + 1), 3000);
      return;
    }
  } else {
    // Nếu là chế độ video, dựa vào các chỉ báo loader để chờ xong
    if (isGeneratingVideo()) {
      if (attempt > 80) { // ~4 phút, tránh treo vô hạn nếu Flow lỗi
        console.warn('[Flow Helper] Quá thời gian chờ tạo video cho phân đoạn', segment.segmentNumber, '- dừng theo dõi.');
        updateSegmentStatus(segment.segmentNumber, 'completed');
        if (isAuto && autoRun && runId === currentRunId) {
          runAutoLoop(runId);
        }
        return;
      }
      setTimeout(() => waitForCompletionAndDownload(segment, baselineSrcs, isAuto, runId, baselineErrorCount, attempt + 1), 3000);
      return;
    }
  }

  console.log('[Flow Helper] Phân đoạn', segment.segmentNumber, 'đã tạo xong. Đang tải kết quả...');
  const downloaded = await triggerDownload(segment, baselineSrcs);

  if (downloaded) {
    updateSegmentStatus(segment.segmentNumber, 'completed');

    if (isAuto && autoRun && runId === currentRunId) {
      // Chờ thêm 1.5 giây để tệp được ghi xuống và trình duyệt ổn định trước khi chạy tiếp
      setTimeout(() => runAutoLoop(runId), 1500);
    }
  } else {
    console.warn('[Flow Helper] Tải kết quả chưa thành công (ảnh đen/trống hoặc chưa sẵn sàng). Thử lại...');
    if (attempt > 80) {
      console.warn('[Flow Helper] Quá thời gian chờ tải kết quả cho phân đoạn', segment.segmentNumber, '- dừng theo dõi.');
      updateSegmentStatus(segment.segmentNumber, 'completed');
      if (isAuto && autoRun && runId === currentRunId) {
        runAutoLoop(runId);
      }
      return;
    }
    setTimeout(() => waitForCompletionAndDownload(segment, baselineSrcs, isAuto, runId, baselineErrorCount, attempt + 1), 3000);
  }
}

// Lắng nghe tín hiệu cập nhật từ background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'RELOAD_QUEUE') {
    init();
    sendResponse({ success: true });
  }

  if (message.action === 'RUN_SINGLE_SEGMENT') {
    const idx = message.index;
    chrome.storage.local.get(['flowQueue'], (result) => {
      if (result.flowQueue && result.flowQueue.segments[idx]) {
        queue = result.flowQueue;
        const segment = queue.segments[idx];

        console.log('[Flow Helper] Tự chạy phân đoạn đơn lẻ qua Debugger:', idx + 1);
        updateSegmentStatus(segment.segmentNumber, 'processing');

        runSegmentViaDebugger(segment, (res) => {
          if (res && res.success) {
            waitForCompletionAndDownload(segment, res.baselineSrcs, false, null, res.baselineErrorCount || 0);
          } else {
            updateSegmentStatus(segment.segmentNumber, 'pending');
          }
        });

        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'no_segment' });
      }
    });
    return true; // Giữ kênh tin nhắn bất đồng bộ
  }
});

// Sao chép văn bản vào Clipboard
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Lỗi khi dùng navigator.clipboard:', err);
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  el.remove();
}

// Hiển thị thông báo dạng Toast nổi trên màn hình
function showToast(text, type = 'info') {
  const toast = document.createElement('div');
  Object.assign(toast.style, {
    position: 'fixed',
    top: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: type === 'error' ? 'rgba(255, 71, 87, 0.95)' : 'rgba(46, 213, 115, 0.95)',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
    fontSize: '0.82rem',
    fontWeight: '700',
    zIndex: '1000000',
    fontFamily: 'sans-serif',
    pointerEvents: 'none',
    transition: 'all 0.3s ease'
  });
  toast.innerText = text;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Lưu trạng thái hàng đợi vào storage
function saveQueueState() {
  if (queue) {
    chrome.storage.local.set({ flowQueue: queue });
  }
}

// Chuẩn hoá chuỗi thành tên file/thư mục an toàn (bỏ dấu tiếng Việt, ký tự đặc biệt)
function sanitizeFilename(str, maxLen = 60) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, maxLen) || 'untitled';
}

// Thư mục lưu kết quả của kịch bản hiện tại (trong thư mục Downloads)
function getProjectFolder() {
  return `AutoPoster_Flow/${sanitizeFilename(queue.title)}`;
}

// Chụp lại danh sách các ảnh (đủ lớn, không phải icon) đang có trên trang, dùng làm mốc so sánh
// để nhận diện ảnh MỚI được Flow sinh ra sau khi bấm Tạo (tránh tải nhầm ảnh tham chiếu có sẵn trong dự án)
function snapshotImageSrcs() {
  const set = new Set();
  findElementInShadows(document.body, (el) => {
    if (el.tagName === 'IMG') {
      const src = el.currentSrc || el.src || '';
      const w = el.naturalWidth || el.width || 0;
      const h = el.naturalHeight || el.height || 0;
      if (src && w > 180 && h > 180) set.add(src);
    }
    return false;
  });
  return set;
}

function findNewGeneratedImages(baselineSrcs) {
  const found = [];
  const seenThisPass = new Set();
  findElementInShadows(document.body, (el) => {
    if (el.tagName === 'IMG') {
      const src = el.currentSrc || el.src || '';
      const w = el.naturalWidth || el.width || 0;
      const h = el.naturalHeight || el.height || 0;
      if (src && el.complete && w > 180 && h > 180 && !seenThisPass.has(src) && !(baselineSrcs && baselineSrcs.has(src))) {
        seenThisPass.add(src);
        found.push(el);
      }
    }
    return false;
  });
  return found;
}

// Kiểm tra xem canvas ảnh có bị trống (trong suốt hoàn toàn) hoặc đen xì hay không
function isCanvasBlankOrBlack(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let hasNonBlack = false;
    let hasTransparent = false;
    let hasVisibleBlack = false;

    // Kiểm tra mẫu (sample) các pixel để tối ưu hiệu năng
    const step = 16;
    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a <= 50) {
        hasTransparent = true;
      } else {
        if (r > 20 || g > 20 || b > 20) {
          hasNonBlack = true;
        } else {
          hasVisibleBlack = true;
        }
      }
    }

    // Nếu toàn bộ là trong suốt -> trống (blank)
    if (!hasNonBlack && !hasVisibleBlack) {
      return true;
    }
    // Nếu toàn bộ là màu đen đặc (không có pixel trong suốt, không có pixel sáng màu) -> đen xì (solid black)
    if (!hasNonBlack && !hasTransparent) {
      return true;
    }
    return false; // Có sự pha trộn (có nét đen trên nền trong suốt, hoặc có màu sáng, v.v.)
  } catch (e) {
    // Nếu bị lỗi bảo mật khi getImageData (CORS), mặc định coi như không bị đen để tiếp tục lưu qua URL dự phòng
    return false;
  }
}

// Quét tìm tất cả các thẻ thông báo lỗi chính sách Google Flow trên trang
function getPolicyErrorNodes() {
  const nodes = [];
  findElementInShadows(document.body, (el) => {
    const text = (el.textContent || el.innerText || '').toLowerCase();
    const isErrorText = text.includes('vi phạm các chính sách') || 
                        text.includes('vi phạm chính sách') || 
                        text.includes('violate our policies') || 
                        text.includes('policy violation') ||
                        (text.includes('không thành công') && text.includes('thử một câu lệnh khác')) ||
                        (text.includes('unsuccessful') && text.includes('try a different'));
    
    if (isErrorText) {
      // Đảm bảo el là node lá chứa thông báo lỗi để tránh đếm trùng
      let hasChildWithError = false;
      const children = el.childNodes || [];
      for (const child of children) {
        const childText = (child.textContent || child.innerText || '').toLowerCase();
        if (childText.includes('vi phạm') || childText.includes('policy') || childText.includes('violate') || childText.includes('không thành công') || childText.includes('unsuccessful')) {
          hasChildWithError = true;
          break;
        }
      }
      if (!hasChildWithError) {
        nodes.push(el);
      }
    }
    return false;
  });
  return nodes;
}

// Tải một tệp kết quả (ảnh/video) về máy. Xử lý riêng cho blob: URL vì background service worker
// không đọc được blob URL được tạo trong tab trang web -> phải fetch ngay trong content script rồi
// chuyển sang data URL trước khi gửi cho background.js tải xuống.
async function downloadResultUrl(src, filename) {
  if (!src) return false;
  try {
    const isImage = filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.webp');

    if (isImage) {
      let dataUrl = null;

      // Thử dùng canvas trước cho mọi loại URL
      try {
        const img = [...document.querySelectorAll('img')].find(i => i.src === src || i.currentSrc === src);
        if (img) {
          // Ép buộc tải & decode xong ảnh trước khi vẽ
          try {
            await img.decode();
          } catch (e) {
            console.warn('[Flow Helper] Lỗi decode ảnh:', e);
          }

          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 512;
          canvas.height = img.naturalHeight || img.height || 512;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          let mime = 'image/png';
          if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mime = 'image/jpeg';
          else if (filename.endsWith('.webp')) mime = 'image/webp';

          // Kiểm tra xem ảnh có bị đen/trống hoàn toàn không
          if (isCanvasBlankOrBlack(canvas)) {
            console.warn('[Flow Helper] Phát hiện ảnh trống hoặc đen trên canvas. Bỏ qua tải lượt này.');
            return false;
          }

          dataUrl = canvas.toDataURL(mime);
        }
      } catch (e) {
        console.warn('[Flow Helper] Vẽ canvas lỗi, chuyển sang cơ chế dự phòng:', e);
      }

      // Nếu vẽ canvas thất bại và là blob URL, tiến hành fetch cục bộ
      if (!dataUrl && src.startsWith('blob:')) {
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error('[Flow Helper] Fetch blob lỗi:', e);
        }
      }

      // Gửi lưu ảnh trực tiếp vào ổ đĩa của server Remotion (gửi kèm srcUrl để dự phòng).
      // filename đã có dạng "<folder>/images/scene-01.jpg" - chỉ bỏ phần
      // "<folder>/" ở đầu (vì folderPath gửi riêng), giữ lại "images/..." để
      // không bị ghi phẳng ra ngoài thư mục con.
      const folderPrefix = `${queue.folderPath || 'example'}/`;

      // QUAN TRỌNG: phải đợi phản hồi THẬT từ server (background.js -> API save-image) rồi mới
      // coi là thành công. Trước đây gửi xong là return true ngay (fire-and-forget), nên nếu tab
      // bị gián đoạn (Flow tự điều hướng, debugger reattach...) đúng lúc đó, segment.status không
      // bao giờ được set về 'completed' dù ảnh đã lưu thành công trên server -> kẹt "processing" mãi.
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'SAVE_IMAGE_LOCAL',
          payload: {
            folderPath: queue.folderPath || 'example',
            filename: filename.startsWith(folderPrefix) ? filename.slice(folderPrefix.length) : filename.split('/').pop(),
            srcUrl: src,
            dataUrl: dataUrl
          }
        }, (res) => {
          if (chrome.runtime.lastError) {
            console.error('[Flow Helper] Lỗi gửi lưu ảnh:', chrome.runtime.lastError.message);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(res || { success: false });
          }
        });
      });

      if (response.success) {
        console.log('[Flow Helper] Đã xác nhận lưu ảnh thành công:', response.path || filename);
      } else {
        console.warn('[Flow Helper] Server báo lưu ảnh KHÔNG thành công:', response.error);
      }
      return response.success === true;
    } else {
      // Chế độ video hoặc tệp khác thì vẫn tải qua download manager truyền thống, cũng đợi
      // phản hồi thật (downloadId) trước khi coi là thành công, cùng lý do như trên.
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'DOWNLOAD_FILE', url: src, filename, conflictAction: 'overwrite' }, (res) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(res || { success: false });
          }
        });
      });
      return response.success === true;
    }
  } catch (e) {
    console.error('[Flow Helper] Lỗi tải file kết quả:', e);
    return false;
  }
}

// Gộp toàn bộ dữ liệu đầu vào (prompt, lời thoại...) + tên file kết quả đã tải thành 1 file
// manifest.json lưu chung thư mục với kết quả, để dễ quản lý/đối chiếu sau này.
function saveManifest() {
  if (!queue) return;
  const manifest = {
    title: queue.title,
    isImage: queue.isImage,
    createdAt: queue.createdAt,
    updatedAt: Date.now(),
    segments: queue.segments.map(s => ({
      segmentNumber: s.segmentNumber,
      visualDescription: s.visualDescription,
      dialogueOrNarration: s.dialogueOrNarration,
      subtitle: s.subtitle,
      textPrompt: s.textPrompt,
      durationSeconds: s.durationSeconds,
      status: s.status,
      files: (s.downloadedFiles || []).map(f => f.filename)
    }))
  };
  const jsonStr = JSON.stringify(manifest, null, 2);

  // Mã hóa JSON sang base64 data URL
  const base64Str = btoa(unescape(encodeURIComponent(jsonStr)));
  const dataUrl = 'data:application/json;base64,' + base64Str;

  chrome.runtime.sendMessage({
    action: 'SAVE_IMAGE_LOCAL',
    payload: {
      folderPath: queue.folderPath || 'example',
      filename: 'manifest.json',
      dataUrl: dataUrl
    }
  }, (res) => {
    const err = chrome.runtime.lastError;
  });
}

// Tìm ô nhập liệu của Google Flow
function findInputField() {
  // 1. Dò tìm các phần tử nhập liệu chuyên biệt có placeholder hoặc aria-label liên quan đến prompt trước
  const target = findElementInShadows(document.body, (el) => {
    const tagName = el.tagName;
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const cls = (typeof el.className === 'string') ? el.className.toLowerCase() : '';

    const isInput = tagName === 'TEXTAREA' ||
      (tagName === 'INPUT' && el.type === 'text') ||
      (el.getAttribute && el.getAttribute('contenteditable') === 'true');

    if (!isInput) return false;

    // Loại trừ ô nhập tên dự án (thường có class hoặc tên chứa title, name, header, topbar)
    const id = (el.id || '').toLowerCase();
    if (id.includes('title') || id.includes('name') || cls.includes('title') || cls.includes('project-name')) {
      return false;
    }

    // Ưu tiên ô nhập có placeholder liên quan đến sinh video/hình ảnh
    return placeholder.includes('tạo') || placeholder.includes('create') || placeholder.includes('muốn') ||
      placeholder.includes('prompt') || placeholder.includes('write') || placeholder.includes('gõ') ||
      ariaLabel.includes('tạo') || ariaLabel.includes('create') || ariaLabel.includes('prompt');
  });

  if (target) return target;

  // 2. Dự phòng: Dò tìm phần tử TEXTAREA hoặc DIV contenteditable nằm ở nửa dưới màn hình
  // (Ô nhập prompt luôn nằm ở dưới cùng màn hình, còn ô tiêu đề nằm ở trên cùng)
  let bestInput = null;
  let maxRectTop = -1;

  findElementInShadows(document.body, (el) => {
    const tagName = el.tagName;
    const isInput = tagName === 'TEXTAREA' ||
      (el.getAttribute && el.getAttribute('contenteditable') === 'true');

    if (isInput) {
      const rect = el.getBoundingClientRect();
      // Chọn ô nhập liệu nằm thấp nhất màn hình (tọa độ top lớn nhất)
      if (rect.top > maxRectTop && rect.height > 0) {
        maxRectTop = rect.top;
        bestInput = el;
      }
    }
    return false; // Tiếp tục duyệt toàn bộ
  });

  return bestInput;
}

// Kiểm tra xem hệ thống có đang vẽ/sinh video không
function isGeneratingVideo() {
  const bodyText = document.body.innerText || '';
  const hasGeneratingText = /creating|generating|đang tạo|đang xử lý|đang vẽ|chờ/i.test(bodyText);
  const loaders = document.querySelectorAll('[role="progressbar"], svg[class*="progress"], div[class*="loading"], .spinner, [class*="progress-circle"]');
  const shadowLoader = findElementInShadows(document.body, (el) => {
    const role = el.getAttribute ? el.getAttribute('role') : '';
    const cls = el.className || '';
    return role === 'progressbar' || (typeof cls === 'string' && (cls.includes('spinner') || cls.includes('loading') || cls.includes('progress')));
  });
  return hasGeneratingText || loaders.length > 0 || shadowLoader !== null;
}

// Tải kết quả (ảnh hoặc video) vừa được Flow tạo ra cho 1 phân đoạn về máy,
// đặt tên file theo số thứ tự phân đoạn + gộp chung vào 1 thư mục theo tên kịch bản,
// đồng thời cập nhật manifest.json để đối chiếu ngược lại với dữ liệu đầu vào (prompt/lời thoại).
async function triggerDownload(segment, baselineSrcs) {
  if (!queue || !segment) return false;

  const folder = queue.folderPath || 'example';
  const segmentNumber = segment.segmentNumber;
  const paddedNum = String(segmentNumber).padStart(2, '0');

  // Ghi kết quả vào đúng segment "sống" hiện tại (tra lại theo segmentNumber), KHÔNG dùng thẳng
  // tham chiếu `segment` truyền vào - vì hàm này chạy sau khi đã await download (mất thời gian),
  // trong lúc đó `queue` gần như chắc chắn đã bị gán lại object mới bởi chrome.storage.onChanged.
  const recordDownloadedFile = (file) => {
    const liveSegment = getLiveSegment(segmentNumber);
    if (!liveSegment) return;
    liveSegment.downloadedFiles = liveSegment.downloadedFiles || [];
    if (!liveSegment.downloadedFiles.some(f => f.filename === file.filename)) {
      liveSegment.downloadedFiles.push(file);
    }
  };

  if (queue.isImage) {
    const newImages = findNewGeneratedImages(baselineSrcs);
    if (newImages.length === 0) {
      console.warn('[Flow Helper] Không tìm thấy ảnh mới để tải cho phân đoạn', segmentNumber, '- có thể Flow chưa vẽ xong hoặc đổi cấu trúc trang.');
      return false;
    }

    let downloadSuccess = true;
    const downloadPromises = newImages.map(async (imgEl, i) => {
      const src = imgEl.currentSrc || imgEl.src;

      // Nhận dạng extension
      let ext = queue.imageExt || 'jpg';
      if (src.includes('.png')) ext = 'png';
      else if (src.includes('.webp')) ext = 'webp';
      else if (src.includes('.jpg') || src.includes('.jpeg')) ext = 'jpg';

      const suffix = newImages.length > 1 ? `_${i + 1}` : '';
      const filename = `${folder}/images/scene-${paddedNum}${suffix}.${ext}`;

      const ok = await downloadResultUrl(src, filename);
      if (ok) {
        console.log('[Flow Helper] Đã tải ảnh:', filename);
        recordDownloadedFile({ src, filename });
      } else {
        downloadSuccess = false;
      }
    });

    await Promise.all(downloadPromises);

    if (downloadSuccess) {
      saveQueueState();
      saveManifest();
      return true;
    } else {
      return false;
    }
  }

  // Chế độ video: tìm thẻ <video> vừa render kết quả
  const videoEl = findElementInShadows(document.body, (el) => el.tagName === 'VIDEO');
  if (videoEl && videoEl.src) {
    const filename = `${folder}/scene-${paddedNum}.mp4`;
    const ok = await downloadResultUrl(videoEl.src, filename);
    if (ok) {
      console.log('[Flow Helper] Đã tải video:', filename);
      recordDownloadedFile({ src: videoEl.src, filename });
      saveQueueState();
      saveManifest();
      return true;
    }
    return false;
  }

  console.warn('[Flow Helper] Không tìm thấy video kết quả để tải cho phân đoạn', segmentNumber);
  return false;
}

// Quy trình tự động chạy hàng đợi
function runAutoLoop(runId) {
  if (!isExtensionAlive()) {
    console.warn('[Flow Helper] Extension context đã bị hủy (có thể do vừa reload) - dừng vòng lặp tự động.');
    return;
  }
  if (runId !== currentRunId) {
    console.log('[Flow Helper] Vòng lặp phiên chạy bị hủy vì không khớp runId:', runId);
    return;
  }
  if (!autoRun || !queue) return;

  const nextPendingIdx = queue.segments.findIndex(s => s.status === 'pending');

  if (nextPendingIdx !== -1) {
    const inputEl = findInputField();
    if (!inputEl) {
      console.log('[Flow Helper] Chưa vào trang dự án hoặc chưa tải xong ô nhập.');
      if (runId === currentRunId) {
        autoRunTimeout = setTimeout(() => runAutoLoop(runId), 3000);
      }
      return;
    }

    console.log('[Flow Helper] Bắt đầu tự động điền & tạo phân đoạn:', nextPendingIdx + 1);
    const segment = queue.segments[nextPendingIdx];

    // Đảm bảo ở đúng chế độ trước khi điền
    const isSwitching = selectFlowMode(queue.isImage);
    const delay = isSwitching ? 1000 : 0;

    updateSegmentStatus(segment.segmentNumber, 'processing');

    runSegmentViaDebugger(segment, (res) => {
      if (runId !== currentRunId) return; // hủy giữa chừng nếu đổi phiên
      if (res && res.success) {
        // Chờ Google Flow tạo xong ảnh/video và tải về máy, sau đó mới tiếp tục
        waitForCompletionAndDownload(segment, res.baselineSrcs, true, runId, res.baselineErrorCount || 0);
      } else {
        updateSegmentStatus(segment.segmentNumber, 'pending');
        if (runId === currentRunId) {
          autoRunTimeout = setTimeout(() => runAutoLoop(runId), 3500); // Thử lại sau 3.5s
        }
      }
    });
  } else {
    // Không còn phân đoạn nào ở trạng thái pending
    console.log('[Flow Helper] Hoàn thành toàn bộ kịch bản!');
    autoRun = false;
    chrome.storage.local.set({ autoRunActive: false });
    renderSidebar();
    showToast('🎉 Hoàn thành toàn bộ kịch bản!', 'success');

    // Gửi yêu cầu hiển thị thông báo hệ thống (desktop notification)
    chrome.runtime.sendMessage({
      action: 'SHOW_SYSTEM_NOTIFICATION',
      payload: {
        title: 'AutoPoster Google Flow',
        message: `🎉 Đã hoàn tất tự động sinh ảnh cho kịch bản: "${queue ? queue.title : ''}"!`
      }
    }, (response) => {
      const err = chrome.runtime.lastError;
    });
  }
}

// Vẽ Sidebar cố định bên cạnh phải màn hình (Đã chuyển sang native Side Panel của Edge/Chrome)
function renderSidebar() {
  // Giao diện đã được hiển thị trên native Side Panel của Edge/Chrome
}

// Lắng nghe thay đổi cấu hình từ side panel để Dừng/Chạy kịp thời
chrome.storage.onChanged.addListener((changes) => {
  if (changes.autoRunActive) {
    autoRun = changes.autoRunActive.newValue === true;
    console.log('[Flow Helper] Cập nhật trạng thái AutoRun:', autoRun);
    if (!autoRun) {
      currentRunId = null; // HỦY TẤT CẢ PHIÊN CHẠY ĐANG HOẠT ĐỘNG NGAY LẬP TỨC!
      if (autoRunTimeout) {
        clearTimeout(autoRunTimeout);
        autoRunTimeout = null;
      }
    }
  }
  if (changes.flowQueue) {
    queue = changes.flowQueue.newValue || null;
  }
});

// Khởi chạy
init();
