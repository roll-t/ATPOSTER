// Cấu hình để khi click vào Action Icon thì mở Side Panel thay vì mở popup
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Background] Lỗi cấu hình sidePanel behavior:', error));

// Khóa sidePanel mặc định trên mọi trang
chrome.sidePanel
  .setOptions({ enabled: false })
  .catch((error) => console.error('[Background] Lỗi cấu hình sidePanel mặc định:', error));

const FLOW_TABS_PATTERN = '*://labs.google/fx/*';
const FLOW_DEFAULT_URL = 'https://labs.google/fx/vi/tools/flow';

// Mở 1 URL trong cửa sổ trình duyệt THÔNG THƯỜNG (có thanh tab).
// Lý do cần hàm riêng: khi app AutoPoster được khởi động dưới dạng "desktop app" (StartApp.bat
// dùng `chrome/msedge --app=...`), cửa sổ đó là kiểu "app window" không có thanh tab hiển thị.
// Nếu gọi thẳng chrome.tabs.create({url}) mà không chỉ định windowId, Chrome sẽ nhét tab mới
// vào ngay cửa sổ app-mode đang focus đó -> tab được tạo ra thật nhưng người dùng không có
// cách nào thấy/chuyển sang nó (không có tab bar), nên bấm nút "Đẩy sang..." sẽ trông như
// không có phản ứng gì. Ở đây ta dò xem có cửa sổ 'normal' (loại có thanh tab) nào đang mở
// không; nếu có thì mở tab vào đó, còn không thì tạo hẳn 1 cửa sổ 'normal' mới để đảm bảo
// luôn nhìn thấy được.
function openInNormalWindow(url) {
  chrome.windows.getAll({ populate: false }, (windows) => {
    const normalWindow = (windows || []).find(w => w.type === 'normal');
    if (normalWindow) {
      chrome.tabs.create({ url, windowId: normalWindow.id }, () => {
        chrome.windows.update(normalWindow.id, { focused: true });
      });
    } else {
      chrome.windows.create({ url, type: 'normal', focused: true });
    }
  });
}

// Xác định URL nên mở khi không còn tab Flow nào đang chạy: ưu tiên mở lại đúng dự án gần nhất
// người dùng đang xem (do content-flow.js tự ghi nhớ) thay vì trang dashboard trống (dashboard
// trống sẽ tự động bấm "Dự án mới", tạo ra 1 dự án không liên quan).
function openFlowTab() {
  chrome.storage.local.get(['lastFlowProjectUrl'], (result) => {
    openInNormalWindow(result.lastFlowProjectUrl || FLOW_DEFAULT_URL);
  });
}

// Bật sidePanel riêng cho các tab Google Flow
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;

  if (tab.url.includes('labs.google/fx')) {
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

async function ensureAttached(tabId) {
  if (attachedTab === tabId) return;
  if (attachedTab !== null) {
    try {
      await chrome.debugger.detach({ tabId: attachedTab });
    } catch (_) {}
    attachedTab = null;
  }
  await new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
  attachedTab = tabId;
}

async function detach() {
  if (attachedTab !== null) {
    try {
      await chrome.debugger.detach({ tabId: attachedTab });
    } catch (_) {}
    attachedTab = null;
  }
}

async function debugTypeAndSubmit(tabId, x, y, prompt) {
  await ensureAttached(tabId);

  // 1) Click để focus thật
  await sendCmd(tabId, "Input.dispatchMouseEvent", {
    type: "mousePressed", x, y, button: "left", clickCount: 1,
  });
  await sendCmd(tabId, "Input.dispatchMouseEvent", {
    type: "mouseReleased", x, y, button: "left", clickCount: 1,
  });
  await wait(180);

  // 2) Chọn tất cả (Ctrl+A) để xoá cũ
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "keyDown", modifiers: 2, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
  });
  await sendCmd(tabId, "Input.dispatchKeyEvent", {
    type: "keyUp", modifiers: 2, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
  });
  await wait(60);

  // 3) Gõ chữ thật qua CDP
  await sendCmd(tabId, "Input.insertText", { text: prompt });
  await wait(250);

  // 4) Enter thật
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
    const { x, y, prompt } = message.payload;
    const tabId = sender.tab.id;
    debugTypeAndSubmit(tabId, x, y, prompt)
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ success: false, error: String(e.message || e) }));
    return true;
  }

  if (message.action === 'DEBUG_DETACH') {
    const tabId = sender.tab?.id;
    detach()
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ success: false, error: String(e.message || e) }));
    return true;
  }

  if (message.action === 'DOWNLOAD_FILE') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || 'video.mp4',
      saveAs: false,
      conflictAction: message.conflictAction || 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Lỗi tải video:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Background] Đang tải video, ID:', downloadId);
        sendResponse({ success: true, downloadId });
      }
    });
    return true;
  }

  if (message.action === 'START_QUEUE') {
    const { segments, title, isImage, folderPath, imageExt } = message.payload;

    // Lưu vào bộ nhớ cục bộ của extension
    chrome.storage.local.set({
      autoRunActive: false,
      flowQueue: {
        title,
        isImage: isImage === true,
        folderPath: folderPath || 'example',
        imageExt: imageExt || 'jpg',
        segments: segments.map(s => ({
          ...s,
          status: 'pending' // pending, processing, completed, error
        })),
        createdAt: Date.now()
      }
    }, () => {
      console.log('[Flow Helper Extension] Đã lưu kịch bản và kích hoạt tự động chạy (AutoRun).');

      // Tìm tab Google Flow đang mở
      chrome.tabs.query({ url: FLOW_TABS_PATTERN }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const targetTab = tabs[0];

          // Focus vào tab đó
          chrome.tabs.update(targetTab.id, { active: true }, () => {
            chrome.windows.update(targetTab.windowId, { drawAttention: true, focused: true }, () => {
              // Gửi tin nhắn cập nhật dữ liệu cho content script chạy trên tab đó
              chrome.tabs.sendMessage(targetTab.id, { action: 'RELOAD_QUEUE' }, (res) => {
                // Ignore errors if content script chưa được nạp xong
                chrome.runtime.lastError;
              });
            });
          });

          sendResponse({ success: true, status: 'tab_focused' });
        } else {
          // Chưa mở tab Flow -> mở tab mới (ưu tiên dự án gần nhất, xem openFlowTab)
          openFlowTab();
          console.log('[Flow Helper Extension] Đã mở tab mới cho Google Flow.');
          sendResponse({ success: true, status: 'new_tab_opened' });
        }
      });
    });
    return true; // Keep message channel open for async response
  }

  if (message.action === 'SAVE_IMAGE_LOCAL') {
    const { folderPath, filename, srcUrl, dataUrl } = message.payload;

    // Hàm chuyển đổi Uint8Array sang Base64 an toàn cho Service Worker
    const bufferToBase64 = (bytes) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let base64 = '';
      const len = bytes.length;
      for (let i = 0; i < len; i += 3) {
        const b1 = bytes[i];
        const b2 = i + 1 < len ? bytes[i + 1] : 0;
        const b3 = i + 2 < len ? bytes[i + 2] : 0;

        const c1 = b1 >> 2;
        const c2 = ((b1 & 3) << 4) | (b2 >> 4);
        const c3 = i + 1 < len ? (((b2 & 15) << 2) | (b3 >> 6)) : 64;
        const c4 = i + 2 < len ? (b3 & 63) : 64;

        base64 += chars.charAt(c1) + chars.charAt(c2) +
                  (c3 === 64 ? '=' : chars.charAt(c3)) +
                  (c4 === 64 ? '=' : chars.charAt(c4));
      }
      return base64;
    };

    const sendToApi = (base64Url) => {
      fetch('http://localhost:3000/api/prompts/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath, filename, dataUrl: base64Url })
      })
      .then(r => r.json())
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
        .then(res => res.arrayBuffer())
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
      title: title || 'AutoPoster Google Flow Helper',
      message: msg,
      priority: 2
    });
    sendResponse({ success: true });
    return true;
  }
});

// Lắng nghe khi người dùng click vào biểu tượng Logo trên thanh công cụ
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.query({ url: FLOW_TABS_PATTERN }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const targetTab = tabs[0];
      chrome.tabs.update(targetTab.id, { active: true }, () => {
        chrome.windows.update(targetTab.windowId, { focused: true });
      });
    } else {
      openFlowTab();
    }
  });
});
