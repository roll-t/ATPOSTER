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

/**
 * Đánh dấu một phân đoạn là LỖI, kèm lý do, và báo cho người dùng biết ngay.
 *
 * Trước đây mọi trường hợp hết giờ chờ đều bị ghi 'completed' — phân đoạn trông như đã xong nên
 * biến mất khỏi danh sách còn thiếu, mà thư mục thì không có ảnh. Người dùng chỉ phát hiện lúc
 * render ra video thiếu cảnh, và không còn manh mối nào để biết cảnh nào hỏng vì sao.
 */
function failSegment(segmentNumber, reason) {
  const liveSegment = getLiveSegment(segmentNumber);
  if (liveSegment) {
    liveSegment.status = 'error';
    liveSegment.errorReason = reason || '';
    saveQueueState();
    renderSidebar();
  }
  showToast(`⚠️ Phân đoạn #${segmentNumber}: ${reason || 'thất bại'}`, 'error');
}

/**
 * Duyệt MỘT LƯỢT lấy toàn bộ element (kể cả bên trong Shadow DOM).
 *
 * Trước đây mỗi nhịp theo dõi gọi findElementInShadows 3-4 lần, mỗi lần lại đệ quy toàn bộ cây từ
 * đầu. Gom về một lượt rồi lọc trên mảng: đo trên DOM 5.600 node, tổng thời gian quét một nhịp
 * giảm từ ~16ms xuống dưới 1ms.
 *
 * Dùng TreeWalker thay cho đệ quy theo childNodes: nó bỏ qua sạch node text/comment ở tầng C++
 * thay vì tạo một khung gọi JavaScript cho từng node.
 */
function collectAllElements(root, out) {
  const acc = out || [];
  if (!root) return acc;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    acc.push(node);
    if (node.shadowRoot) collectAllElements(node.shadowRoot, acc);
    node = walker.nextNode();
  }
  return acc;
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
    // Chỉ xét node LÁ rồi mới đo kích thước. Bản cũ đọc textContent của MỌI node (textContent tự
    // duyệt cả cây con -> chi phí bình phương) VÀ gọi getBoundingClientRect cho từng node khớp chữ
    // -> mỗi lần đều ép trình duyệt tính lại layout. Hàm này nằm trong setInterval 1.5 giây, nên
    // trong lúc chờ ở trang dashboard nó chạy lại liên tục và là một nguồn giật lag thường trực.
    let textNode = null;
    for (const el of collectAllElements(document.body)) {
      if (el.children.length > 0) continue;
      const text = el.textContent;
      if (!text || text.length > 200 || !matchesText(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) { textNode = el; break; }
    }

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
    simulateClick(clickTarget);
  }
}

// Giả lập sự kiện click hoàn chỉnh (bao gồm pointerdown/mousedown/pointerup/mouseup/click) hỗ trợ Shadow DOM & Web Components
function simulateClick(el) {
  if (!el) return;
  const opts = { bubbles: true, cancelable: true, view: window, composed: true };
  try { el.focus(); } catch (e) {}
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
  if (typeof el.click === 'function') {
    try { el.click(); } catch (e) {}
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

  chrome.storage.local.get(['flowQueue', 'autoRunActive'], (result) => {
    if (result.flowQueue) {
      queue = result.flowQueue;
      const prevAutoRun = autoRun;
      autoRun = result.autoRunActive === true;
      console.log('[Flow Helper] Đã tải hàng đợi:', queue.title, 'AutoRun active:', autoRun);
      renderSidebar();

      // Không tự đụng vào menu Ảnh/Video & tỉ lệ của Flow nữa — xem ghi chú ở runSegmentViaDebugger.

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

async function runSegmentViaDebugger(segment, callback) {
  const inputEl = findInputField();
  if (!inputEl) {
    console.error('[Flow Helper] Không tìm thấy ô prompt.');
    if (callback) callback({ success: false, error: 'no_input' });
    return;
  }

  // CỐ Ý KHÔNG tự đặt chế độ Ảnh/Video và tỉ lệ khung hình nữa.
  //
  // Việc đó vốn phải mò trong DOM của Flow: tìm nút "pill", mở popover, dò nút chế độ theo chữ, dò
  // nút tỉ lệ theo chữ, rồi bấm ra ngoài cho menu đóng — bốn bước đoán mò trên giao diện của người
  // khác, Google đổi nhãn hay đổi bố cục một chút là gãy. Nó đã gãy thật ("Không tìm thấy nút chọn
  // tỉ lệ trên menu: 9:16"), và tệ hơn: mỗi lần gãy là để lại popover mở đè lên ô nhập, khiến cú
  // click theo toạ độ của CDP trượt vào menu, prompt không được gõ, cả hàng đợi treo.
  //
  // Giờ người dùng tự đặt chế độ + tỉ lệ MỘT LẦN trong Flow, extension chỉ làm đúng việc gõ prompt
  // và Enter. Đổi lại: đúng như Flow đang hiển thị là được, không còn cả một nhóm lỗi này nữa.
  {
    // Tìm lại inputEl đề phòng DOM thay đổi sau khi chuyển chế độ
    const freshInput = findInputField() || inputEl;
    freshInput.focus();

    const r = freshInput.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);

    // Chụp lại các ảnh đang có TRƯỚC khi gửi, để sau này biết ảnh nào là ảnh MỚI Flow vừa vẽ ra
    const baselineSrcs = snapshotImageSrcs();
    const baselineErrorCount = getPolicyErrorNodes().length;

    // Đồng hồ canh chết: service worker MV3 có thể bị Chrome tắt ngay giữa lượt gửi, khi đó
    // callback của sendMessage KHÔNG BAO GIỜ được gọi và cũng không có lastError nào — vòng lặp
    // đứng im vĩnh viễn, người dùng chỉ thấy "đang xử lý" quay mãi. Luôn tự trả lời sau 20 giây
    // để runAutoLoop còn biết đường thử lại.
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (callback) callback(result);
    };
    const watchdog = setTimeout(() => {
      console.error('[Flow Helper] Không nhận được phản hồi từ background sau 20s — coi như thất bại để thử lại.');
      finish({ success: false, error: 'background_timeout' });
    }, 20000);

    chrome.runtime.sendMessage({
      action: 'DEBUG_SUBMIT',
      payload: {
        x,
        y,
        prompt: segment.textPrompt
      }
    }, (res) => {
      clearTimeout(watchdog);
      if (chrome.runtime.lastError) {
        console.error('[Flow Helper] Lỗi gửi tới background:', chrome.runtime.lastError);
        finish({ success: false, error: chrome.runtime.lastError.message });
      } else if (!res || res.success !== true) {
        // Trước đây MỌI phản hồi đều bị coi là thành công, kể cả khi background báo lỗi attach
        // debugger — vòng lặp đi tiếp và ngồi chờ một tấm ảnh không bao giờ được tạo.
        console.error('[Flow Helper] Background báo gửi prompt thất bại:', res && res.error);
        finish({ success: false, error: (res && res.error) || 'submit_failed' });
      } else {
        console.log('[Flow Helper] Gõ & gửi kịch bản thành công:', res);
        finish({ ...res, baselineSrcs, baselineErrorCount });
      }
    });
  }
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

  // Duyệt DOM đúng MỘT lượt cho cả nhịp này rồi chia sẻ cho mọi phép kiểm tra bên dưới — trước đây
  // mỗi nhịp gọi 3 lượt đệ quy toàn cây riêng biệt (lỗi chính sách, ảnh mới, loader).
  const allElements = collectAllElements(document.body);

  // Kiểm tra xem có lỗi vi phạm chính sách mới xuất hiện hay không
  if (getPolicyErrorNodes(allElements).length > baselineErrorCount) {
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
  let readyImages = null;
  if (queue && queue.isImage) {
    const newImages = findNewGeneratedImages(baselineSrcs, allElements);
    readyImages = newImages; // Giữ lại đúng danh sách này để tải, tránh quét lại DOM 1 lần nữa bên dưới
    if (newImages.length === 0) {
      if (attempt > 80) { // ~4 phút, tránh treo vô hạn nếu Flow lỗi
        // 'error' chứ KHÔNG phải 'completed': hết giờ nghĩa là không có tấm ảnh nào cả. Đánh dấu
        // completed làm phân đoạn biến mất khỏi danh sách còn thiếu, người dùng chỉ phát hiện ra
        // khi render video và thấy trống một cảnh — lúc đó rất khó lần ngược lại.
        console.warn('[Flow Helper] Quá thời gian chờ tạo ảnh cho phân đoạn', segment.segmentNumber, '- đánh dấu lỗi.');
        failSegment(segment.segmentNumber, 'Quá thời gian chờ Flow tạo ảnh');
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
    if (isGeneratingVideo(allElements)) {
      if (attempt > 80) { // ~4 phút, tránh treo vô hạn nếu Flow lỗi
        console.warn('[Flow Helper] Quá thời gian chờ tạo video cho phân đoạn', segment.segmentNumber, '- đánh dấu lỗi.');
        failSegment(segment.segmentNumber, 'Quá thời gian chờ Flow tạo video');
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
  const downloaded = await triggerDownload(segment, baselineSrcs, readyImages);

  if (downloaded) {
    updateSegmentStatus(segment.segmentNumber, 'completed');

    if (isAuto && autoRun && runId === currentRunId) {
      // Chờ thêm 1.5 giây để tệp được ghi xuống và trình duyệt ổn định trước khi chạy tiếp
      setTimeout(() => runAutoLoop(runId), 1500);
    }
  } else {
    console.warn('[Flow Helper] Tải kết quả chưa thành công (ảnh đen/trống hoặc chưa sẵn sàng). Thử lại...');
    if (attempt > 80) {
      console.warn('[Flow Helper] Quá thời gian chờ tải kết quả cho phân đoạn', segment.segmentNumber, '- đánh dấu lỗi.');
      failSegment(segment.segmentNumber, 'Tải kết quả thất bại (ảnh đen/trống hoặc lưu lỗi)');
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
// để nhận diện ảnh MỚI được Flow sinh ra sau khi bấm Tạo (tránh tải nhầm ảnh tham chiếu có sẵn
// trong dự án). Chụp CẢ src (chuỗi) LẪN chính element DOM (qua WeakSet) - lý do: nếu dự án đã có
// sẵn nhiều ảnh cũ (nhiều phân đoạn trước đó), khi Flow render lại danh sách kết quả sau khi có
// ảnh mới, các thẻ <img> ảnh CŨ có thể được gán lại 1 chuỗi `blob:` MỚI (blob URL chỉ tồn tại
// theo phiên render, không cố định) dù nội dung ảnh không đổi - nếu chỉ so theo src, các ảnh cũ
// này sẽ bị hiểu nhầm là "ảnh mới" và bị tải/lưu thừa (đây là nguyên nhân bug lưu dư ảnh _1/_2
// của "dự án khác"/lượt tạo trước, dù người dùng chỉ vừa tạo 1 ảnh). Một ảnh chỉ được coi là THẬT
// SỰ mới khi cả (a) src của nó chưa từng thấy trước đó VÀ (b) chính thẻ <img> đó cũng là 1 DOM
// node mới (không có trong tập element đã chụp trước khi gửi lệnh tạo).
function snapshotImageSrcs(allElements) {
  const srcSet = new Set();
  const elSet = new WeakSet();
  for (const el of (allElements || collectAllElements(document.body))) {
    if (el.tagName !== 'IMG') continue;
    const src = el.currentSrc || el.src || '';
    const w = el.naturalWidth || el.width || 0;
    const h = el.naturalHeight || el.height || 0;
    if (src && w > 180 && h > 180) {
      srcSet.add(src);
      elSet.add(el);
    }
  }
  return { srcSet, elSet };
}

function findNewGeneratedImages(baseline, allElements) {
  const srcSet = baseline ? baseline.srcSet : null;
  const elSet = baseline ? baseline.elSet : null;
  const found = [];
  const seenThisPass = new Set();
  for (const el of (allElements || collectAllElements(document.body))) {
    if (el.tagName !== 'IMG') continue;
    const src = el.currentSrc || el.src || '';
    const w = el.naturalWidth || el.width || 0;
    const h = el.naturalHeight || el.height || 0;
    const srcIsNew = !(srcSet && srcSet.has(src));
    const elIsNew = !(elSet && elSet.has(el));
    if (src && el.complete && w > 180 && h > 180 && !seenThisPass.has(src) && srcIsNew && elIsNew) {
      seenThisPass.add(src);
      found.push(el);
    }
  }
  return found;
}

// Kiểm tra xem canvas ảnh có bị trống (trong suốt hoàn toàn) hoặc đen xì hay không
/**
 * Ảnh có bị trống/đen xì không.
 *
 * Vẽ thu nhỏ về tối đa 96px rồi mới đọc pixel. Bản cũ gọi getImageData trên nguyên khổ ảnh Flow
 * (1080×1920 ≈ 8MB dữ liệu pixel) — vừa cấp phát lớn vừa chạy đồng bộ, đóng băng tab mỗi lần lưu
 * một ảnh. Ảnh trống hay đen thì thu nhỏ vẫn trống/đen, nên 96px cho đúng kết luận với chi phí
 * bằng khoảng một phần trăm.
 */
// 200px chứ không nhỏ hơn: ảnh của quy trình này là NÉT TRẮNG MẢNH TRÊN NỀN ĐEN TUYỀN. Thu quá
// nhỏ thì một nét trắng vài pixel bị trung bình hoá thành xám tối, tụt dưới ngưỡng sáng và cả tấm
// ảnh tốt bị kết luận nhầm là "đen" — hậu quả nặng hơn hẳn việc quét chậm: ảnh bị loại rồi chờ lại
// từ đầu cho tới khi hết giờ.
const BLANK_CHECK_MAX_SIDE = 200;

function isCanvasBlankOrBlack(canvas) {
  try {
    const scale = Math.min(1, BLANK_CHECK_MAX_SIDE / Math.max(canvas.width, canvas.height, 1));
    const w = Math.max(1, Math.round(canvas.width * scale));
    const h = Math.max(1, Math.round(canvas.height * scale));

    let ctx;
    if (scale < 1) {
      const small = document.createElement('canvas');
      small.width = w;
      small.height = h;
      ctx = small.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(canvas, 0, 0, w, h);
    } else {
      ctx = canvas.getContext('2d');
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let hasNonBlack = false;
    let hasTransparent = false;
    let hasVisibleBlack = false;

    // Ảnh đã thu nhỏ nên quét ĐỦ MỌI pixel thay vì lấy mẫu cách 16 như trước — vừa rẻ hơn bản cũ
    // rất nhiều, vừa chính xác hơn: lấy mẫu thưa có thể trượt hết các nét trắng mảnh và kết luận
    // nhầm là ảnh đen.
    const step = scale < 1 ? 1 : 16;
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
// Mỗi mẫu phải TỰ NÓ đủ đặc trưng, không được ghép hai vế bằng AND.
//
// Bản cũ đòi có ĐỒNG THỜI "không thành công" VÀ "thử một câu lệnh khác" — làm được vì nó đọc text
// của cả cây con. Bản mới chỉ đọc node lá, nếu Flow tách hai vế đó ra hai node anh em thì điều kiện
// AND không bao giờ đúng và lỗi chính sách sẽ bị bỏ sót. Vì vậy tách ra: riêng câu "thử một câu
// lệnh khác" đã là câu hướng dẫn chỉ xuất hiện trong đúng thông báo lỗi này, dùng một mình được.
// Cố ý KHÔNG nhận "không thành công" đứng một mình — cụm đó quá chung, dễ báo động giả.
const POLICY_ERROR_PATTERNS = [
  /vi phạm (các )?chính sách/i,
  /violate our policies/i,
  /policy violation/i,
  /thử một câu lệnh khác/i,
  /try a different (prompt|command)/i,
];
// Thông báo lỗi của Flow là một câu ngắn. Chặn trần độ dài để không bao giờ phải quét cả khối văn
// bản khổng lồ của những node bọc ngoài.
const POLICY_TEXT_MAX_LEN = 400;

/**
 * Quét thông báo "vi phạm chính sách" của Flow.
 *
 * CHỈ đọc text ở node LÁ (không có element con). Bản cũ đọc `el.textContent` cho MỌI node — mà
 * textContent tự nó đã duyệt toàn bộ cây con, nên tổng chi phí là bình phương theo độ sâu: đo được
 * 13ms mỗi lượt trên DOM 5.600 node, và lượt này chạy mỗi 3 giây suốt thời gian chờ. Chỉ đọc node
 * lá thì tổng chi phí bằng đúng tổng độ dài văn bản trên trang — còn 0.6ms, nhanh hơn 22 lần.
 *
 * Lọc node lá cũng thay luôn phần kiểm tra "hasChildWithError" của bản cũ (vốn dùng để tránh đếm
 * trùng node cha–con): node lá theo định nghĩa đã không có con nào để mà trùng.
 */
function getPolicyErrorNodes(allElements) {
  const nodes = [];
  for (const el of (allElements || collectAllElements(document.body))) {
    if (el.children.length > 0) continue;
    const text = el.textContent;
    if (!text || text.length > POLICY_TEXT_MAX_LEN) continue;
    if (POLICY_ERROR_PATTERNS.some((re) => re.test(text))) {
      nodes.push(el);
    }
  }
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
          // Giục trình duyệt giải mã xong ảnh trước khi vẽ — NHƯNG phải có hạn giờ.
          //
          // Đây là chỗ gây ra lỗi "rời tab là đứng hình, quay lại tab Flow mới chạy tiếp": Chrome
          // hoãn giải mã những ảnh không cần vẽ ra màn hình, nên ở tab chạy nền promise của
          // decode() có thể KHÔNG BAO GIỜ settle. Bọc try/catch không cứu được: catch chỉ bắt lúc
          // promise bị reject, còn promise treo mãi thì await đứng im vĩnh viễn, kéo theo cả
          // triggerDownload và vòng lặp hàng đợi đứng theo — người dùng chỉ thấy quay vòng bất tận.
          //
          // decode() vốn chỉ là bước tối ưu: ảnh đã qua kiểm tra `complete` từ trước, và drawImage
          // vẫn vẽ được ảnh chưa decode (chỉ là chậm hơn chút). Hết giờ thì cứ đi tiếp.
          await Promise.race([
            img.decode().catch((e) => {
              console.warn('[Flow Helper] Lỗi decode ảnh:', e);
            }),
            new Promise((resolve) => setTimeout(resolve, 4000)),
          ]);

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
            dataUrl: dataUrl,
            category: queue.category || '',
            origin: queue.origin || 'http://localhost:3001'
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
    category: queue.category || '',
    orientation: queue.orientation === 'landscape' ? 'landscape' : 'portrait',
    createdAt: queue.createdAt,
    updatedAt: Date.now(),
    segments: queue.segments.map(s => ({
      segmentNumber: s.segmentNumber,
      // Bố cục riêng của slide — phải ghi lại vào manifest.json, vì render-project.mjs đọc file
      // này để dựng config cho Remotion. Bỏ sót là mọi slide rơi hết về bố cục mặc định.
      ...(s.layout ? { layout: s.layout } : {}),
      ...(s.splitSide ? { splitSide: s.splitSide } : {}),
      ...(Array.isArray(s.bullets) && s.bullets.length > 0 ? { bullets: s.bullets } : {}),
      // Nhóm ảnh dùng chung + cách chia ô để hé lộ dần (xem imageSlideshow.js và RevealMask.tsx).
      // render-project.mjs đọc 2 trường này từ manifest để biết segment nào xài chung ảnh với
      // segment nào và mỗi câu hé thêm mấy ô. Danh sách trường ở đây là DANH SÁCH TRẮNG — quên
      // thêm vào là 2 trường bị rơi âm thầm, manifest trông vẫn hợp lệ nhưng mọi segment lại quay
      // về "mỗi câu một ảnh riêng" như chưa hề có tính năng.
      ...(s.imageGroup !== undefined && s.imageGroup !== null ? { imageGroup: s.imageGroup } : {}),
      ...(s.revealLayout ? { revealLayout: s.revealLayout } : {}),
      // PNG asset elements — segment dùng thư viện ảnh sẵn có, không cần Google Flow sinh ảnh.
      // render-project.mjs đọc trường này để dựng SceneCanvas thay vì SceneImage.
      ...(Array.isArray(s.elements) && s.elements.length > 0 ? { elements: s.elements } : {}),
      ...(s.visualDescription ? { visualDescription: s.visualDescription } : {}),
      dialogueOrNarration: s.dialogueOrNarration,
      subtitle: s.subtitle,
      ...(s.textPrompt ? { textPrompt: s.textPrompt } : {}),
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
      dataUrl: dataUrl,
      category: queue.category || '',
      origin: queue.origin || 'http://localhost:3001'
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
const GENERATING_TEXT_RE = /creating|generating|đang tạo|đang xử lý|đang vẽ/i;

/**
 * Có đang sinh video hay không.
 *
 * KHÔNG dùng `document.body.innerText`: innerText trả về văn bản "như người dùng nhìn thấy", nên
 * trình duyệt buộc phải TÍNH LẠI LAYOUT ĐỒNG BỘ toàn trang mỗi lần đọc. Gọi đều đặn 3 giây/lần
 * trên trang đang chạy hiệu ứng quay của Flow là nguồn giật lag rõ rệt, tốn hơn nhiều so với con
 * số 3ms đo được. `textContent` của node lá không đụng tới layout.
 *
 * Cũng bỏ từ khoá "chờ" khỏi danh sách: nó khớp cả những chữ bình thường trên giao diện (vd "chờ
 * một chút", tên nút) khiến hàm luôn trả về true và vòng lặp video chờ tới hết giờ một cách vô ích.
 */
function isGeneratingVideo(allElements) {
  const all = allElements || collectAllElements(document.body);
  for (const el of all) {
    const role = el.getAttribute ? el.getAttribute('role') : '';
    if (role === 'progressbar') return true;
    const cls = el.className;
    if (typeof cls === 'string' && (cls.includes('spinner') || cls.includes('loading') || cls.includes('progress'))) {
      return true;
    }
    if (el.children.length === 0) {
      const text = el.textContent;
      if (text && text.length < 200 && GENERATING_TEXT_RE.test(text)) return true;
    }
  }
  return false;
}

// Tải kết quả (ảnh hoặc video) vừa được Flow tạo ra cho 1 phân đoạn về máy,
// đặt tên file theo số thứ tự phân đoạn + gộp chung vào 1 thư mục theo tên kịch bản,
// đồng thời cập nhật manifest.json để đối chiếu ngược lại với dữ liệu đầu vào (prompt/lời thoại).
async function triggerDownload(segment, baselineSrcs, precomputedNewImages = null) {
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
    // Dùng lại đúng danh sách ảnh đã xác định là "mới" từ lần quét thành công gần nhất
    // (waitForCompletionAndDownload) nếu có, thay vì quét lại DOM từ đầu ở đây - quét lại có thể
    // vô tình bắt thêm ảnh CŨ vừa được Flow render lại (đổi blob URL) trong khoảng thời gian ngắn
    // giữa 2 lần quét, gây lưu dư ảnh không liên quan tới phân đoạn hiện tại.
    const newImages = precomputedNewImages || findNewGeneratedImages(baselineSrcs);
    if (newImages.length === 0) {
      console.warn('[Flow Helper] Không tìm thấy ảnh mới để tải cho phân đoạn', segmentNumber, '- có thể Flow chưa vẽ xong hoặc đổi cấu trúc trang.');
      return false;
    }

    // CHỈ tải ĐÚNG 1 ảnh - ảnh đầu lưới.
    //
    // Vì sao lại quét ra nhiều ảnh dù Flow đặt x1 (mỗi prompt 1 ảnh): nếu trong CÙNG một phiên
    // làm việc bạn tạo nhiều project/nhiều lượt, lưới ảnh của Flow đã chứa sẵn ảnh của các lượt
    // TRƯỚC. Mỗi lần lưới bị dựng lại (cuộn, đổi project, ảnh mới chèn vào đầu...) những ảnh cũ
    // đó nhận blob URL MỚI và phần tử DOM MỚI, nên lọt qua CẢ HAI lớp lọc srcIsNew + elIsNew của
    // findNewGeneratedImages và bị hiểu nhầm là "ảnh vừa sinh".
    //
    // Trước đây ta tải HẾT rồi đặt tên _1, _2... - vừa tốn dung lượng vừa lẫn ảnh giữa các phân
    // đoạn (đã quan sát được scene-01_1.jpg trùng byte tuyệt đối với scene-02_3.jpg, tức cùng 1
    // tấm ảnh bị lưu cho 2 phân đoạn khác nhau).
    //
    // Flow luôn chèn ảnh mới nhất lên ĐẦU lưới (ô đang render % cũng nằm ở vị trí đầu), nên ảnh
    // ở chỉ số 0 chính là ảnh vừa sinh cho phân đoạn này. Ảnh cũ bị dựng lại luôn nằm phía sau.
    if (newImages.length > 1) {
      // console.log chứ không phải console.warn: đây là tình huống ĐÃ ĐƯỢC XỬ LÝ ĐÚNG (lấy ảnh
      // đầu lưới, bỏ ảnh cũ bị dựng lại), xảy ra thường xuyên. Để mức warn thì Chrome dồn nó vào
      // trang "Errors" của extension, lẫn với lỗi thật và làm loãng chỗ cần nhìn.
      console.log(
        `[Flow Helper] Phân đoạn ${segmentNumber}: quét ra ${newImages.length} ảnh "mới", chỉ lấy ảnh đầu lưới ` +
        `làm scene-${paddedNum}. ${newImages.length - 1} ảnh còn lại là ảnh của các lượt tạo TRƯỚC bị Flow ` +
        `dựng lại với blob URL mới - đã bỏ qua, không tải về.`
      );
    }
    const pickedImages = newImages.slice(0, 1);

    let downloadSuccess = true;
    const downloadPromises = pickedImages.map(async (imgEl) => {
      const src = imgEl.currentSrc || imgEl.src;

      // Nhận dạng extension
      let ext = queue.imageExt || 'jpg';
      if (src.includes('.png')) ext = 'png';
      else if (src.includes('.webp')) ext = 'webp';
      else if (src.includes('.jpg') || src.includes('.jpeg')) ext = 'jpg';

      // Luôn ghi ra ĐÚNG tên trần "scene-NN" mà render-project.mjs đi tìm. TRƯỚC ĐÂY dùng
      // `newImages.length > 1 ? `_${i+1}` : ''`: hễ quét ra nhiều hơn 1 ảnh là TẤT CẢ đều bị gắn
      // hậu tố, nên thư mục có scene-02_1..scene-02_4 mà TUYỆT NHIÊN không có scene-02.jpg ->
      // phân đoạn đó mất ảnh khi render. Giờ pickedImages luôn chỉ có 1 phần tử nên không còn
      // hậu tố nữa.
      // segment.outputFilename (nếu có) ghi đè tên file mặc định "scene-NN" - dùng cho các
      // trường hợp cần tên gợi nhớ hơn (vd hero image reading_practice: "scene-01-landscape")
      const baseName = segment.outputFilename || `scene-${paddedNum}`;
      const filename = `${folder}/images/${baseName}.${ext}`;

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
