let queue = null;
let autoRun = false;
let currentLang = 'vi';

const FLOW_TABS_PATTERN = '*://labs.google/fx/*';
function isFlowTabUrl(url) {
  return !!url && url.includes('labs.google/fx');
}

const i18n = {
  vi: {
    headerTitle: 'Bảng điều khiển Google Flow',
    emptyState: `Chưa nhận được kịch bản nào từ App AutoPoster.<br/><br/>Vui lòng tạo kịch bản và nhấn "Đẩy sang Google Flow".`,
    currentScript: 'Kịch bản hiện tại',
    enableAutoRun: 'Kích hoạt Tự động chạy (Auto Run)',
    btnRunAll: '🚀 Run tất cả kịch bản',
    btnStopAll: '⏹ Dừng chạy tự động',
    autoRunActive: '● Đang tự động chạy hàng đợi...',
    autoRunInactive: '○ Tự động chạy đang tắt.',
    statusPending: 'Đang chờ',
    statusProcessing: 'Đang vẽ video...',
    statusCompleted: 'Đã hoàn thành ✓',
    reset: '[Đặt lại]',
    btnRun: 'Tự chạy',
    btnCopyText: 'Chép Text',
    btnRecopyText: 'Chép lại',
    btnCopyJson: 'Chép JSON',
    btnClearQueue: 'Xóa danh sách kịch bản',
    confirmClear: 'Xóa kịch bản hiện tại?',
    toastF5: '❌ Lỗi: Vui lòng F5 lại trang Google Flow!',
    toastOpenFlow: '❌ Hãy mở trang Google Flow trước!',
    toastRunning: (num) => `🚀 Đang tự chạy phân đoạn #${num}...`,
    toastResetSuccess: (num) => `🔄 Đặt lại phân đoạn #${num} thành công!`,
    toastCopyPrompt: (num) => `📋 Đã chép prompt phân đoạn #${num}`,
    toastCopyJson: (num) => `📋 Đã chép JSON phân đoạn #${num}`
  },
  en: {
    headerTitle: 'Google Flow Panel',
    emptyState: `No scripts received from AutoPoster App.<br/><br/>Please generate a prompt and click "Push to Google Flow".`,
    currentScript: 'Current Script',
    enableAutoRun: 'Enable Auto Run',
    btnRunAll: '🚀 Run All Slides',
    btnStopAll: '⏹ Stop Auto Run',
    autoRunActive: '● Queue is running automatically...',
    autoRunInactive: '○ Auto Run is disabled.',
    statusPending: 'Pending',
    statusProcessing: 'Generating video...',
    statusCompleted: 'Completed ✓',
    reset: '[Reset]',
    btnRun: 'Run',
    btnCopyText: 'Copy Text',
    btnRecopyText: 'Recopy',
    btnCopyJson: 'Copy JSON',
    btnClearQueue: 'Clear script list',
    confirmClear: 'Clear current script?',
    toastF5: '❌ Error: Please refresh (F5) the Google Flow page!',
    toastOpenFlow: '❌ Please open the Google Flow page first!',
    toastRunning: (num) => `🚀 Running segment #${num} automatically...`,
    toastResetSuccess: (num) => `🔄 Reset segment #${num} successfully!`,
    toastCopyPrompt: (num) => `📋 Copied prompt for segment #${num}`,
    toastCopyJson: (num) => `📋 Copied JSON for segment #${num}`
  }
};

// Tự động đẩy tab sang Google Flow khi sidepanel được mở
chrome.tabs.query({ url: FLOW_TABS_PATTERN }, (tabs) => {
  if (tabs && tabs.length > 0) {
    const targetTab = tabs[0];
    chrome.tabs.update(targetTab.id, { active: true }, () => {
      chrome.windows.update(targetTab.windowId, { focused: true });
    });
  } else {
    // Dùng background.js để mở tab mới (nó tự chọn URL dự án Flow gần nhất nếu có, và đảm bảo
    // mở trong cửa sổ trình duyệt bình thường có thanh tab, tránh trường hợp app đang chạy dưới
    // dạng "desktop app" khiến tab mới bị tạo ra nhưng không thể nhìn thấy/chuyển sang được).
    chrome.runtime.sendMessage({ action: 'OPEN_FLOW_TAB' });
  }
});

function loadAndRender() {
  chrome.storage.local.get(['flowQueue', 'autoRunActive', 'lang'], (result) => {
    queue = result.flowQueue || null;
    autoRun = result.autoRunActive === true;
    currentLang = result.lang || 'vi';
    
    // Set active class cho các nút chọn ngôn ngữ
    const btnVi = document.getElementById('lang-btn-vi');
    const btnEn = document.getElementById('lang-btn-en');
    if (btnVi && btnEn) {
      if (currentLang === 'vi') {
        btnVi.classList.add('active');
        btnEn.classList.remove('active');
      } else {
        btnEn.classList.add('active');
        btnVi.classList.remove('active');
      }
    }
    
    render();
  });
}

function render() {
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  const t = i18n[currentLang] || i18n['vi'];

  // Cập nhật tiêu đề header
  const headerTitle = document.getElementById('header-title');
  if (headerTitle) {
    headerTitle.innerText = t.headerTitle;
  }

  if (!queue) {
    contentEl.innerHTML = `
      <div class="empty-state">
        ${t.emptyState}
      </div>
    `;
    return;
  }

  const doneCount = queue.segments.filter(s => s.status === 'completed').length;
  const totalCount = queue.segments.length;
  const progressPercent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  // Tiêu đề kịch bản
  let html = `
    <div class="title-label">${t.currentScript}</div>
    <div class="title-text" title="${queue.title}">${queue.title}</div>
    
    <div class="control-panel" style="display: flex; flex-direction: column; gap: 8px;">
      <button type="button" id="run-all-btn" style="
        width: 100%;
        padding: 8px 16px;
        font-size: 12px;
        font-weight: bold;
        border-radius: 8px;
        cursor: pointer;
        border: none;
        color: white;
        background: ${autoRun ? '#ef4444' : 'linear-gradient(135deg, #FE2C55, #ff5a79)'};
        box-shadow: ${autoRun ? '0 2px 8px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(254, 44, 85, 0.3)'};
        transition: all 0.2s ease;
      ">
        ${autoRun ? t.btnStopAll : t.btnRunAll}
      </button>
      <div class="status-text" style="color: ${autoRun ? '#10b981' : 'rgba(255,255,255,0.4)'}; text-align: center;">
        ${autoRun ? t.autoRunActive : t.autoRunInactive}
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span class="title-label" style="font-size: 10px;">${currentLang === 'vi' ? 'Tiến độ' : 'Progress'}</span>
      <span style="font-size: 11px; font-weight: bold; color: rgba(255,255,255,0.6);">${doneCount}/${totalCount} ${currentLang === 'vi' ? 'hoàn thành' : 'completed'}</span>
    </div>
    <div class="pbar">
      <div class="pfill" style="width: ${progressPercent}%;"></div>
    </div>
    
    <div class="list-container">
  `;

  queue.segments.forEach((seg, idx) => {
    let statusText = t.statusPending;
    let statusColor = 'rgba(255, 255, 255, 0.4)';
    if (seg.status === 'processing') {
      statusText = queue.isImage ? (currentLang === 'vi' ? 'Đang vẽ ảnh...' : 'Generating image...') : t.statusProcessing;
      statusColor = '#f59e0b';
    } else if (seg.status === 'completed') {
      statusText = t.statusCompleted;
      statusColor = '#10b981';
    }

    const isProcessing = seg.status === 'processing';
    const isCompleted = seg.status === 'completed';

    html += `
      <div class="segment-item ${isProcessing ? 'processing' : ''}">
        <div class="segment-info">
          <div class="segment-header">
            <span class="segment-num">#${seg.segmentNumber}</span>
            <span class="segment-status ${seg.status || 'pending'}" style="color: ${statusColor}">${statusText}</span>
            ${isCompleted || isProcessing ? `
              <span class="btn-reset" data-index="${idx}" style="color: #ff5a79; font-size: 10px; cursor: pointer; text-decoration: underline; margin-left: 8px;">${t.reset}</span>
            ` : ''}
          </div>
          <div class="segment-desc" title="${seg.dialogueOrNarration || seg.visualDescription}">
            ${seg.dialogueOrNarration || seg.visualDescription}
          </div>
        </div>
        <div class="btn-group">
          <button class="btn-run" data-index="${idx}" style="background: #0284c7; color: white; margin-bottom: 2px;">${t.btnRun}</button>
          <button class="btn-copy-text ${isCompleted ? 'completed' : ''}" data-index="${idx}">
            ${isCompleted ? t.btnRecopyText : t.btnCopyText}
          </button>
          <button class="btn-copy-json" data-index="${idx}">${t.btnCopyJson}</button>
        </div>
      </div>
    `;
  });

  html += `
    </div>
    <button class="btn-clear" id="clear-queue-btn">${t.btnClearQueue}</button>
  `;

  contentEl.innerHTML = html;

  // Đăng ký sự kiện cho nút Run tất cả / Dừng lại
  const runAllBtn = document.getElementById('run-all-btn');
  if (runAllBtn) {
    // Hàm phụ gửi tin nhắn RELOAD_QUEUE tới tab Google Flow đang mở
    const sendReloadQueueMessage = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const targetTab = tabs.find(t => isFlowTabUrl(t.url));
        if (targetTab) {
          chrome.tabs.sendMessage(targetTab.id, { action: 'RELOAD_QUEUE' });
        } else {
          chrome.tabs.query({ url: FLOW_TABS_PATTERN }, (flowTabs) => {
            if (flowTabs && flowTabs.length > 0) {
              chrome.tabs.sendMessage(flowTabs[0].id, { action: 'RELOAD_QUEUE' });
            }
          });
        }
      });
    };

    runAllBtn.onclick = () => {
      autoRun = !autoRun;
      
      // Cho dù là bật hay tắt hàng đợi tự động, chúng ta cũng nên dọn dẹp các trạng thái 'processing' (Đang vẽ ảnh...)
      // bị kẹt trước đó về lại 'pending' để sẵn sàng chạy tiếp/chạy lại từ đầu.
      chrome.storage.local.get(['flowQueue'], (result) => {
        if (result.flowQueue) {
          const updatedQueue = result.flowQueue;
          let changed = false;
          updatedQueue.segments.forEach(s => {
            if (s.status === 'processing') {
              s.status = 'pending';
              changed = true;
            }
          });
          
          if (changed) {
            chrome.storage.local.set({ flowQueue: updatedQueue, autoRunActive: autoRun }, () => {
              if (autoRun) sendReloadQueueMessage();
            });
          } else {
            chrome.storage.local.set({ autoRunActive: autoRun }, () => {
              if (autoRun) sendReloadQueueMessage();
            });
          }
        } else {
          chrome.storage.local.set({ autoRunActive: autoRun }, () => {
            if (autoRun) sendReloadQueueMessage();
          });
        }
      });
    };
  }

  // Đăng ký sự kiện Tự chạy phân đoạn
  document.querySelectorAll('.btn-run').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const seg = queue.segments[idx];

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const targetTab = tabs.find(t => isFlowTabUrl(t.url));
        if (targetTab) {
          chrome.tabs.sendMessage(targetTab.id, { action: 'RUN_SINGLE_SEGMENT', index: idx }, (response) => {
            if (chrome.runtime.lastError) {
              showToast(t.toastF5);
            } else {
              showToast(t.toastRunning(seg.segmentNumber));
            }
          });
        } else {
          // Tìm bất kỳ tab Google Flow nào đang mở
          chrome.tabs.query({ url: FLOW_TABS_PATTERN }, (flowTabs) => {
            if (flowTabs && flowTabs.length > 0) {
              const activeTab = flowTabs[0];
              chrome.tabs.update(activeTab.id, { active: true }, () => {
                chrome.windows.update(activeTab.windowId, { focused: true }, () => {
                  chrome.tabs.sendMessage(activeTab.id, { action: 'RUN_SINGLE_SEGMENT', index: idx }, (response) => {
                    if (chrome.runtime.lastError) {
                      showToast(t.toastF5);
                    } else {
                      showToast(t.toastRunning(seg.segmentNumber));
                    }
                  });
                });
              });
            } else {
              showToast(t.toastOpenFlow);
            }
          });
        }
      });
    };
  });

  // Đăng ký sự kiện Đặt lại trạng thái
  document.querySelectorAll('.btn-reset').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const seg = queue.segments[idx];
      seg.status = 'pending';
      chrome.storage.local.set({ flowQueue: queue }, () => {
        showToast(t.toastResetSuccess(seg.segmentNumber));
      });
    };
  });

  // Đăng ký sự kiện chép text
  document.querySelectorAll('.btn-copy-text').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const seg = queue.segments[idx];
      copyText(seg.textPrompt);
      
      // Cập nhật trạng thái
      seg.status = 'completed';
      chrome.storage.local.set({ flowQueue: queue }, () => {
        showToast(t.toastCopyPrompt(seg.segmentNumber));
      });
    };
  });

  // Đăng ký sự kiện chép JSON
  document.querySelectorAll('.btn-copy-json').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const seg = queue.segments[idx];
      const fallbackJson = {
        visualDescription: seg.visualDescription,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        durationSeconds: seg.durationSeconds || 10
      };
      const jsonStr = JSON.stringify(seg.jsonPrompt || fallbackJson, null, 2);
      copyText(jsonStr);
      
      seg.status = 'completed';
      chrome.storage.local.set({ flowQueue: queue }, () => {
        showToast(t.toastCopyJson(seg.segmentNumber));
      });
    };
  });

  // Đăng ký sự kiện xóa
  const clearBtn = document.getElementById('clear-queue-btn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (confirm(t.confirmClear)) {
        chrome.storage.local.remove(['flowQueue', 'autoRunActive']);
      }
    };
  }
}

function copyText(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  el.remove();
}

function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = text;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2000);
}

// Khởi chạy
loadAndRender();

// Lắng nghe thay đổi nút ngôn ngữ
const btnVi = document.getElementById('lang-btn-vi');
const btnEn = document.getElementById('lang-btn-en');
if (btnVi && btnEn) {
  btnVi.onclick = () => {
    currentLang = 'vi';
    chrome.storage.local.set({ lang: 'vi' }, () => {
      loadAndRender();
    });
  };
  btnEn.onclick = () => {
    currentLang = 'en';
    chrome.storage.local.set({ lang: 'en' }, () => {
      loadAndRender();
    });
  };
}

// Lắng nghe thay đổi storage
chrome.storage.onChanged.addListener((changes) => {
  if (changes.flowQueue || changes.autoRunActive || changes.lang) {
    loadAndRender();
  }
});
