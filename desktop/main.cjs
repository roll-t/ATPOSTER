const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, exec } = require('child_process');

const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;
const fs = require('fs');

const ROOT_DIR = app.isPackaged
  ? process.resourcesPath
  : path.resolve(__dirname, '..');

const STUDIO_DIR = ROOT_DIR;
const ICON_PATH = process.platform === 'win32'
  ? path.join(ROOT_DIR, 'public', 'icons', 'logo.ico')
  : path.join(ROOT_DIR, 'public', 'icons', 'logo.png');

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;

// Đảm bảo chỉ có một instance chạy tại 1 thời điểm
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(SERVER_URL, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function killServer() {
  if (serverProcess && serverProcess.pid) {
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${serverProcess.pid} /T /F`, () => { });
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch (e) {
      // ignore
    }
    serverProcess = null;
  }
}

function findStandaloneServer() {
  const candidates = [
    path.join(ROOT_DIR, '.next', 'standalone', 'server.js'),
    path.join(ROOT_DIR, '.next', 'standalone', 'app', 'server.js'),
    path.join(ROOT_DIR, '.next', 'server.js'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function ensureServerRunning() {
  const isAlreadyRunning = await checkServerReady();
  if (isAlreadyRunning) {
    console.log(`[Nexora Video Desktop] Server da chay san tren port ${PORT}`);
    return;
  }

  const standaloneServer = findStandaloneServer();
  console.log(`[Nexora Video Desktop] Dang khoi dong Video Studio Server...`);

  try {
    if (standaloneServer) {
      const standaloneAppDir = path.dirname(standaloneServer);
      const srcStatic = path.join(ROOT_DIR, '.next', 'static');
      const destStatic = path.join(standaloneAppDir, '.next', 'static');
      if (fs.existsSync(srcStatic) && !fs.existsSync(destStatic)) {
        try {
          fs.cpSync(srcStatic, destStatic, { recursive: true });
        } catch (e) {
          console.error('[Nexora Video Desktop] Khong the copy static files:', e);
        }
      }

      // Dùng trực tiếp Node runtime tích hợp sẵn của Electron
      console.log(`[Nexora Video Desktop] Khoi chay Standalone Server: ${standaloneServer}`);
      serverProcess = spawn(process.execPath, [standaloneServer], {
        cwd: path.dirname(standaloneServer),
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(PORT) },
        stdio: 'pipe'
      });
    } else if (fs.existsSync(ROOT_DIR)) {
      // Fallback sang npm run dev
      console.log(`[Nexora Video Desktop] Khoi chay qua npm run dev tai ${ROOT_DIR}...`);
      const isWindows = process.platform === 'win32';
      const npmCmd = isWindows ? 'npm.cmd' : 'npm';

      serverProcess = spawn(npmCmd, ['run', 'dev'], {
        cwd: ROOT_DIR,
        env: { ...process.env, PORT: String(PORT) },
        shell: isWindows,
        stdio: 'pipe'
      });
    } else {
      console.error('[Nexora Video Desktop] Khong tim thay thu muc ROOT_DIR:', ROOT_DIR);
    }
  } catch (err) {
    console.error('[Nexora Video Desktop] Loi khi khoi dong server process:', err);
  }

  if (serverProcess) {
    serverProcess.on('error', (err) => {
      console.error('[Studio Process Error]:', err);
    });

    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('Ready in') || msg.includes('compiled') || msg.includes('Local:')) {
          console.log(`[Studio Server] ${msg.trim()}`);
        }
      });
    }

    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        console.error(`[Studio Error] ${data.toString().trim()}`);
      });
    }

    serverProcess.on('exit', (code) => {
      if (!isQuitting) {
        console.log(`[Studio Server] Tien trinh thoat voi ma: ${code}`);
      }
    });
  }
}

function createApplicationMenu() {
  const template = [
    {
      label: 'Nexora Video',
      submenu: [
        {
          label: 'Tai lai trang (Reload)',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'Tai lai bat buoc (Force Reload)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: 'Toan man hinh (Fullscreen)',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        {
          label: 'Cong cu phat trien (DevTools)',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Thoat ung dung',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Chinh sua',
      submenu: [
        { role: 'undo', label: 'Hoan tac' },
        { role: 'redo', label: 'Lam lai' },
        { type: 'separator' },
        { role: 'cut', label: 'Cat' },
        { role: 'copy', label: 'Sao chep' },
        { role: 'paste', label: 'Dan' },
        { role: 'selectAll', label: 'Chon tat ca' }
      ]
    },
    {
      label: 'Thu phong',
      submenu: [
        { role: 'zoomIn', label: 'Phong to' },
        { role: 'zoomOut', label: 'Thu nho' },
        { role: 'resetZoom', label: 'Mac dinh 100%' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0B0F1A',
    title: 'Nexora Video Studio',
    icon: ICON_PATH,
    autoHideMenuBar: true,
    show: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: 14, y: 16 } }
      : {
          titleBarOverlay: {
            color: '#0B0F1A',
            symbolColor: '#F8FAFF',
            height: 36
          }
        }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false
    }
  });

  createApplicationMenu();

  // Load splash screen ngay lap tuc
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Xu ly link ngoai (mo bang trinh duyet mac dinh, khong mo trong app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Cho den khi Next.js Server khoi dong thanh cong roi load
  const startTime = Date.now();
  const maxWaitMs = 45000;

  let hasLoaded = false;
  const pollInterval = setInterval(async () => {
    if (isQuitting || !mainWindow || hasLoaded) {
      clearInterval(pollInterval);
      return;
    }

    const ready = await checkServerReady();
    if (ready && !hasLoaded) {
      hasLoaded = true;
      clearInterval(pollInterval);
      console.log('[Nexora Video Desktop] Server da san sang! Dang load giao dien...');
      mainWindow.loadURL(SERVER_URL);
    } else if (Date.now() - startTime > maxWaitMs) {
      clearInterval(pollInterval);
      dialog.showErrorBox(
        'Loi khoi dong',
        'Khong the ket noi toi Video Studio sau 45 giay. Vui long kiem tra lai terminal hoac chay lai ung dung.'
      );
    }
  }, 600);
}

app.whenReady().then(async () => {
  await ensureServerRunning();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  killServer();
});

app.on('window-all-closed', () => {
  isQuitting = true;
  killServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
