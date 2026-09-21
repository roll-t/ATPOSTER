// Cấu hình để khi click vào Action Icon thì mở Side Panel thay vì mở popup
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Background] Lỗi cấu hình sidePanel behavior:', error));

// Khóa sidePanel mặc định trên mọi trang
chrome.sidePanel
  .setOptions({ enabled: false })
  .catch((error) => console.error('[Background] Lỗi cấu hình sidePanel mặc định:', error));

const FLOW_TABS_PATTERNS = [
  '*://flow.google.com/*',
  '*://labs.google/fx/*'
];
const FLOW_DEFAULT_URL = 'https://flow.google.com/';

function isFlowUrl(url) {
  if (!url) return false;
  return url.includes('flow.google.com') || url.includes('labs.google/fx');
}

// Mở 1 URL trong cửa sổ trình duyệt THÔNG THƯỜNG (có thanh tab).
// Lý do cần hàm riêng: khi app AutoPoster được khởi động dưới dạng "desktop app" (StartApp.bat
// dùng `chrome/msedge --app=...`), cửa sổ đó là kiểu "app window" không có thanh tab hiển thị.
// Nếu gọi thẳng chrome.tabs.create({url}) mà không chỉ định windowId, Chrome sẽ nhét tab mới
// vào ngay cửa sổ app-mode đang focus đó -> tab được tạo ra thật nhưng người dùng không có
// cách nào thấy/chuyển sang nó (không có tab bar), nên bấm nút "Đẩy sang..." sẽ trông như
// không có phản ứng gì. Ở đây ta dò xem có cửa sổ 'normal' (loại có thanh tab) nào đang mở
// không; nếu có thì mở tab vào đó, còn không thì tạo hẳn 1 cửa sổ 'normal' mới để đảm bảo
// luôn nhìn thấy được.
function openInNormalWindow(url, onOpened) {
  chrome.windows.getAll({ populate: false }, (windows) => {
    const normalWindow = (windows || []).find(w => w.type === 'normal');
    if (normalWindow) {
      chrome.tabs.create({ url, windowId: normalWindow.id }, (tab) => {
        if (tab?.id) chrome.storage.local.set({ flowTargetTabId: tab.id });
        chrome.windows.update(normalWindow.id, { focused: true });
        if (onOpened) onOpened(tab);
      });
    } else {
      chrome.windows.create({ url, type: 'normal', focused: true }, (win) => {
        const tab = win?.tabs?.[0];
        if (tab?.id) chrome.storage.local.set({ flowTargetTabId: tab.id });
        if (onOpened) onOpened(tab);
      });
    }
  });
}

// chrome.tabs.query() không đảm bảo tab đầu tiên là tab người dùng vừa làm việc. Ưu tiên tab đã
// ghim cho hàng đợi, sau đó tab active, cuối cùng tab được truy cập gần nhất.
function selectBestFlowTab(tabs, preferredTabId) {
  if (!Array.isArray(tabs) || tabs.length === 0) return null;
  return tabs.find((tab) => tab.id === preferredTabId)
    || tabs.find((tab) => tab.active)
    || [...tabs].sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
}

function normalizeStudioOrigin(value) {
  try {
    const url = new URL(value || 'http://localhost:3001');
    const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'http:' || !isLocalHost) return 'http://localhost:3001';
    return url.origin;
  } catch (_) {
    return 'http://localhost:3001';
  }
}

// Mở thẳng trang Google Flow (sẽ tự động bấm "Dự án mới" nếu ở trang chủ dashboard)
function openFlowTab() {
  openInNormalWindow(FLOW_DEFAULT_URL);
}

// Bật sidePanel riêng cho các tab Google Flow
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;

  if (isFlowUrl(tab.url)) {
    chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true
    }).catch((error) => console.error('[Background] Lỗi bật sidePanel:', error));
  } else {
    chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    }).catch((error) => console.error('[Background] Lỗi tắt sidePanel:', error));
  }
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let attachedTab = null;

chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === attachedTab) {
    console.warn('[Background] debugger bị tách khỏi tab', source.tabId);
    attachedTab = null;
  }
});

function sendCmd(tabId, method, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params || {}, (res) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(res);
    });
  });
}

/**
 * Hỏi CHÍNH Chrome xem tab này đã bị extension gắn debugger chưa.
 *
 * KHÔNG được tin biến `attachedTab` trong bộ nhớ: đây là service worker Manifest V3, Chrome tự
 * TẮT nó sau ~30 giây không có việc. Một lượt sinh ảnh của Flow kéo dài vài phút, nên service
 * worker gần như chắc chắn bị tắt giữa chừng. Khi nó khởi động lại, `attachedTab` về null trong
 * khi phiên debugger CŨ vẫn còn gắn trên tab — lần gửi kế tiếp gọi attach lần nữa và Chrome trả
 * "Another debugger is already attached", lệnh gõ prompt không bao giờ chạy, còn giao diện thì cứ
 * quay vòng chờ. Đây là nguyên nhân trực tiếp của hiện tượng "lâu lâu không tạo được, loading mãi".
 */
async function isDebuggerAttached(tabId) {
  try {
    const targets = await chrome.debugger.getTargets();
    return (targets || []).some((t) => t.tabId === tabId && t.attached);
  } catch (_) {
    return false;
  }
}

async function ensureAttached(tabId) {
  if (await isDebuggerAttached(tabId)) {
    attachedTab = tabId;
    try { await sendCmd(tabId, 'Emulation.setFocusEmulationEnabled', { enabled: true }); } catch (_) {}
    try { await sendCmd(tabId, 'Page.setWebLifecycleState', { state: 'active' }); } catch (_) {}
    return;
  }

  // Gỡ phiên cũ trên tab KHÁC (nếu có) để không giữ thanh "đang gỡ lỗi" thừa.
  if (attachedTab !== null && attachedTab !== tabId) {
    try { await chrome.debugger.detach({ tabId: attachedTab }); } catch (_) {}
  }
  attachedTab = null;

  try {
    await new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId }, '1.3', () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  } catch (err) {
    const msg = String(err.message || err);
    // Phiên cũ còn sót lại sau khi service worker bị tắt: gỡ ra rồi gắn lại đúng một lần.
    if (/already attached/i.test(msg)) {
      try { await chrome.debugger.detach({ tabId }); } catch (_) {}
      await new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId }, '1.3', () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });
    } else {
      throw err;
    }
  }
  attachedTab = tabId;
  // Giữ lifecycle của Flow ở trạng thái active khi người dùng chuyển tab. Không cướp focus thật,
  // nhưng tránh Chrome hạ timer/render pipeline xuống chế độ nền quá chậm.
  try { await sendCmd(tabId, 'Emulation.setFocusEmulationEnabled', { enabled: true }); } catch (_) {}
  try { await sendCmd(tabId, 'Page.setWebLifecycleState', { state: 'active' }); } catch (_) {}
  try { await chrome.tabs.update(tabId, { autoDiscardable: false }); } catch (_) {}
}

async function detach(tabId = null) {
  // Service worker MV3 có thể đã restart và mất biến attachedTab dù debugger vẫn còn gắn.
  // Tab gửi DEBUG_DETACH là nguồn sự thật đáng tin cậy hơn bộ nhớ tạm của worker.
  const targetTabId = tabId ?? attachedTab;
  if (targetTabId !== null && targetTabId !== undefined) {
    try {
      if (await isDebuggerAttached(targetTabId)) {
        await chrome.debugger.detach({ tabId: targetTabId });
      }
    } catch (_) {}
    if (attachedTab === targetTabId) attachedTab = null;
  }
}

const PROMPT_TARGET_ATTRIBUTE = 'data-nexora-flow-prompt-target';

function deepTargetExpression(attribute, token, action) {
  const serializedAttribute = JSON.stringify(attribute);
  const serializedToken = JSON.stringify(token);
  return `(() => {
    const attribute = ${serializedAttribute};
    const token = ${serializedToken};
    const stack = [document];
    let target = null;
    while (stack.length && !target) {
      const root = stack.pop();
      const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const element of elements) {
        if (element.getAttribute && element.getAttribute(attribute) === token) {
          target = element;
          break;
        }
        if (element.shadowRoot) stack.push(element.shadowRoot);
      }
    }
    if (!target || !target.isConnected) return { found: false };
    const rect = target.getBoundingClientRect();
    const style = getComputedStyle(target);
    if (rect.width < 2 || rect.height < 2 || style.display === 'none' || style.visibility === 'hidden') {
      return { found: false, reason: 'not_visible' };
    }
    ${action}
  })()`;
}

async function focusMarkedPrompt(tabId, token) {
  if (!token) throw new Error('missing_prompt_target');
  const expression = deepTargetExpression(PROMPT_TARGET_ATTRIBUTE, token, `
    target.focus({ preventScroll: true });
    if (target.isContentEditable) {
      const selection = target.ownerDocument.getSelection();
      const range = target.ownerDocument.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const root = target.getRootNode();
    const focused = document.activeElement === target || (root && root.activeElement === target);
    return { found: true, focused, tag: target.tagName, x: rect.left, y: rect.top };
  `);
  const result = await sendCmd(tabId, 'Runtime.evaluate', { expression, returnByValue: true });
  const value = result?.result?.value;
  if (!value?.found || !value.focused) throw new Error('prompt_target_stale');
}

async function verifyMarkedPromptHasText(tabId, token) {
  const expression = deepTargetExpression(PROMPT_TARGET_ATTRIBUTE, token, `
    const text = typeof target.value === 'string'
      ? target.value
      : (target.innerText || target.textContent || '');
    return { found: true, hasText: text.trim().length > 0, length: text.length };
  `);
  const result = await sendCmd(tabId, 'Runtime.evaluate', { expression, returnByValue: true });
  const value = result?.result?.value;
  if (!value?.found || !value.hasText) throw new Error('prompt_insert_failed');
}

async function debugTypeAndSubmit(tabId, payload) {
  const { prompt, targetToken } = payload || {};
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('empty_prompt');
  await ensureAttached(tabId);

  // Focus đúng DOM node đã được content script đánh dấu. Không dùng tọa độ viewport: tọa độ cũ
  // sẽ trượt sang nút "+" khi Flow vừa mở composer, đổi layout hoặc người dùng cuộn trang.
  // preventScroll giữ nguyên vị trí người dùng đang xem.
  await focusMarkedPrompt(tabId, targetToken);
  await wait(80);

  // 2) Chọn tất cả để xoá cũ:
  // Hỗ trợ cả Windows/Linux (Ctrl+A: modifiers: 2) lẫn Mac (Cmd+A: modifiers: 4)
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "keyDown", modifiers: 2, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
  });
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "keyUp", modifiers: 2, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
  });
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "keyDown", modifiers: 4, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
  });
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "keyUp", modifiers: 4, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
  });
  await wait(80);

  // Xoá nội dung cũ bằng Backspace
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "rawKeyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8,
  });
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8,
  });
  await wait(60);

  // 3) Gõ chữ thật qua CDP
  await sendCmd(tabId, "Input.insertText", { text: prompt });
  await wait(180);
  await verifyMarkedPromptHasText(tabId, targetToken);

  // Submit bằng phím tin cậy trên chính editor đang focus. Tuyệt đối không click nút theo tọa độ;
  // đó là nguồn lỗi bấm nhầm dấu cộng khi giao diện dịch chuyển trong lần tạo đầu tiên.
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "rawKeyDown", key: "Enter", code: "Enter",
    windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13,
  });
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "keyUp", key: "Enter", code: "Enter",
    windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13,
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DEBUG_SUBMIT') {
    const tabId = sender.tab.id;
    debugTypeAndSubmit(tabId, message.payload)
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ success: false, error: String(e.message || e) }));
    return true;
  }

  if (message.action === 'DEBUG_DETACH') {
    const tabId = sender.tab?.id;
    detach(tabId)
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ success: false, error: String(e.message || e) }));
    return true;
  }

  if (message.action === 'DOWNLOAD_FILE') {
    let settled = false;
    let downloadId = null;
    let timeoutId = null;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      chrome.downloads.onChanged.removeListener(onDownloadChanged);
      sendResponse(result);
    };
    const onDownloadChanged = (delta) => {
      if (downloadId === null || delta.id !== downloadId || !delta.state) return;
      if (delta.state.current === 'complete') {
        console.log('[Background] Đã tải xong video, ID:', downloadId);
        finish({ success: true, downloadId });
      } else if (delta.state.current === 'interrupted') {
        finish({ success: false, downloadId, error: delta.error?.current || 'Download interrupted' });
      }
    };
    chrome.downloads.onChanged.addListener(onDownloadChanged);
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || 'video.mp4',
      saveAs: false,
      conflictAction: message.conflictAction || 'uniquify'
    }, (id) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Lỗi tải video:', chrome.runtime.lastError.message);
        finish({ success: false, error: chrome.runtime.lastError.message });
      } else if (typeof id !== 'number') {
        finish({ success: false, error: 'Chrome không trả về mã tải xuống' });
      } else {
        downloadId = id;
        console.log('[Background] Đang tải video, ID:', downloadId);
        // Giữ segment ở trạng thái processing cho tới khi Chrome xác nhận file đã ghi xong.
        // Phòng trường hợp sự kiện complete xảy ra rất nhanh trước nhịp tiếp theo, hỏi lại trạng
        // thái ngay sau khi đã có id.
        chrome.downloads.search({ id: downloadId }, (items) => {
          if (chrome.runtime.lastError || settled) return;
          const item = items && items[0];
          if (item?.state === 'complete') finish({ success: true, downloadId });
          else if (item?.state === 'interrupted') finish({ success: false, downloadId, error: item.error || 'Download interrupted' });
        });
        timeoutId = setTimeout(() => {
          finish({ success: false, downloadId, error: 'Quá thời gian chờ Chrome tải video' });
        }, 10 * 60 * 1000);
      }
    });
    return true;
  }

  if (message.action === 'START_QUEUE') {
    const { segments, title, isImage, folderPath, imageExt, orientation, aspectRatio, category, origin, isSingleScene, singleSceneNumber, autoRun } = message.payload;
    const resolvedFolderPath = folderPath || 'example';

    // Lưu vào bộ nhớ cục bộ của extension
    chrome.storage.local.set({
      autoRunActive: autoRun === true,
      flowQueue: {
        title,
        isImage: isImage === true,
        folderPath: resolvedFolderPath,
        imageExt: imageExt || 'jpg',
        category: category || '',
        aspectRatio: aspectRatio || (orientation === 'landscape' ? '16:9' : '9:16'),
        orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
        origin: origin || 'http://localhost:3001',
        isSingleScene: isSingleScene === true,
        singleSceneNumber: singleSceneNumber || null,
        segments: (segments || []).map(s => ({
          ...s,
          status: (s.status === 'completed' || s.hasImage) ? 'completed' : (s.status || 'pending')
        })),
        createdAt: Date.now()
      }
    }, () => {
      console.log('[Flow Helper Extension] Đã lưu kịch bản. AutoRun:', autoRun === true);

      // Luôn mở thẳng trang dashboard gốc và để dashboard tự bấm "Dự án mới" (xem
      // handleDashboardAutoCreate trong content-flow.js) — MỖI lần đẩy đều tạo 1 dự án Flow mới,
      // không còn mở lại dự án cũ đã dùng cho cùng folderPath trước đó nữa (theo yêu cầu người
      // dùng, để tránh mở nhầm 1 dự án cũ có thể đã lỗi/không còn dùng được).
      const targetUrl = FLOW_DEFAULT_URL;

      // Tìm tab Google Flow đang mở
      chrome.storage.local.get(['flowTargetTabId'], ({ flowTargetTabId }) => chrome.tabs.query({ url: FLOW_TABS_PATTERNS }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const targetTab = selectBestFlowTab(tabs, flowTargetTabId);
          chrome.storage.local.set({ flowTargetTabId: targetTab.id });
          // Focus tab Flow đang có
          chrome.tabs.update(targetTab.id, { active: true }, () => {
            chrome.windows.update(targetTab.windowId, { drawAttention: true, focused: true });
          });
          // Gửi thông báo RELOAD_QUEUE để content script nạp ngay kịch bản mới
          chrome.tabs.sendMessage(targetTab.id, { action: 'RELOAD_QUEUE' }, () => {
            if (chrome.runtime.lastError) { /* tab có thể đang tải lại, không sao */ }
          });
          sendResponse({ success: true, status: 'tab_focused' });
        } else {
          // Chưa mở tab Flow -> mở tab mới thẳng vào Google Flow
          openInNormalWindow(targetUrl);
          console.log('[Flow Helper Extension] Đã mở tab mới cho Google Flow.');
          sendResponse({ success: true, status: 'new_tab_opened' });
        }
      }));
    });
    return true; // Keep message channel open for async response
  }

  if (message.action === 'SAVE_IMAGE_LOCAL') {
    const { folderPath, filename, srcUrl, dataUrl, category, origin } = message.payload;

    /**
     * Đổi Uint8Array sang Base64 trong Service Worker.
     *
     * Bản cũ tự cài thuật toán base64 bằng JavaScript và nối chuỗi từng 4 ký tự một: với ảnh 2MB
     * là hơn 700 nghìn lần nối chuỗi, chạy đồng bộ ngay trong service worker. Dùng btoa() theo
     * từng khối để phần mã hoá chạy ở tầng C++ của trình duyệt, chỉ còn vài chục lần nối chuỗi.
     *
     * Phải chia khối: String.fromCharCode.apply với mảng vài triệu phần tử sẽ tràn ngăn xếp lời
     * gọi. FileReader không dùng được ở đây — Service Worker không có API đó.
     */
    const bufferToBase64 = (bytes) => {
      const CHUNK = 0x8000; // 32KB mỗi lượt, đủ nhỏ để không tràn ngăn xếp
      const parts = [];
      for (let i = 0; i < bytes.length; i += CHUNK) {
        parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
      }
      return btoa(parts.join(''));
    };

    const sendToApi = (base64Url) => {
      const apiHost = normalizeStudioOrigin(origin);
      fetch(`${apiHost}/api/prompts/save-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath, filename, dataUrl: base64Url, category })
      })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `Save API HTTP ${r.status}`);
        return body;
      })
      .then(res => {
        sendResponse(res);
      })
      .catch(err => {
        console.error('[Background] Lỗi gửi tới API save-image:', err);
        sendResponse({ success: false, error: String(err) });
      });
    };

    if (dataUrl) {
      sendToApi(dataUrl);
    } else if (srcUrl && srcUrl.startsWith('http')) {
      // Tải ảnh trực tiếp bằng background script để vượt qua CORS
      fetch(srcUrl)
        .then(async (res) => {
          if (!res.ok) throw new Error(`Image HTTP ${res.status}`);
          const contentType = res.headers.get('content-type') || '';
          if (contentType && !contentType.startsWith('image/')) throw new Error(`Không phải ảnh: ${contentType}`);
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 30 * 1024 * 1024) throw new Error('Ảnh vượt quá giới hạn 30MB');
          return buffer;
        })
        .then(buffer => {
          const bytes = new Uint8Array(buffer);
          const base64 = bufferToBase64(bytes);
          let mime = 'image/png';
          if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mime = 'image/jpeg';
          else if (filename.endsWith('.webp')) mime = 'image/webp';

          const base64Url = `data:${mime};base64,${base64}`;
          sendToApi(base64Url);
        })
        .catch(err => {
          console.error('[Background] Lỗi tải ảnh bằng Service Worker:', err);
          sendResponse({ success: false, error: 'Service Worker fetch failed: ' + String(err) });
        });
    } else {
      sendResponse({ success: false, error: 'Không có dữ liệu ảnh hợp lệ' });
    }
    return true; // Giữ kênh tin nhắn bất đồng bộ
  }

  if (message.action === 'OPEN_FLOW_TAB') {
    openFlowTab();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'SHOW_SYSTEM_NOTIFICATION') {
    const { title, message: msg } = message.payload;
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: title || 'Nexora Video Google Flow Helper',
      message: msg,
      priority: 2
    });
    sendResponse({ success: true });
    return true;
  }
});

// Lắng nghe khi người dùng click vào biểu tượng Logo trên thanh công cụ (dự phòng mở side panel hoặc focus Flow tab)
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
    try {
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        return;
      } else if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
        return;
      }
    } catch (err) {
      console.warn('[Background] Không thể mở side panel bằng chrome.sidePanel.open:', err);
    }
  }

  chrome.storage.local.get(['flowTargetTabId'], ({ flowTargetTabId }) => chrome.tabs.query({ url: FLOW_TABS_PATTERNS }, (tabs) => {
    const targetTab = selectBestFlowTab(tabs, flowTargetTabId);
    if (targetTab) {
      chrome.tabs.update(targetTab.id, { active: true }, () => {
        chrome.windows.update(targetTab.windowId, { focused: true });
      });
    } else {
      openFlowTab();
    }
  }));
});
