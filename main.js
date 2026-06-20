const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createTrayIcon() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
    'WElEQVQ4y2Ng+M9AAWBigAL4TwFmZKABsIA5QGwKxH+B+L8UusUEAJb/gfg/EP8D4n9A/P8/DjPI' +
    'GQDE/4H4HxD/B+J/QPwfiP9TYgDRFgDN+A/E/4D4HxD/B+L/QPyfEgOI9gAAoAwHnh/ORQAAAABJ' +
    'RU5ErkJggg=='
  );
  return icon.resize({ width: 16, height: 16 });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 640,
    resizable: false,
    frame: true,
    title: '番茄钟',
    icon: createTrayIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('番茄钟 - 就绪');

  updateTrayMenu('--:--', '就绪', false);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

function updateTrayMenu(timeText, phaseLabel, isRunning) {
  const contextMenu = Menu.buildFromTemplate([
    { label: `⏱ ${timeText}  ·  ${phaseLabel}`, enabled: false },
    { type: 'separator' },
    {
      label: isRunning ? '⏸ 暂停' : '▶ 开始',
      click: () => mainWindow?.webContents.send('tray-toggle'),
    },
    {
      label: '↺ 重置',
      click: () => mainWindow?.webContents.send('tray-reset'),
    },
    {
      label: '📋 显示窗口',
      click: () => mainWindow?.show(),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// ---- IPC 处理 ----

// 更新托盘
ipcMain.on('timer-update', (_event, data) => {
  if (tray) {
    tray.setToolTip(`番茄钟 - ${data.phaseLabel} ${data.timeText}`);
    updateTrayMenu(data.timeText, data.phaseLabel, data.isRunning);
  }
});

// 发送系统通知
ipcMain.on('send-notification', (_event, data) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: data.title,
      body: data.body,
      icon: createTrayIcon(),
    });
    notification.show();
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
});

// 窗口置顶
ipcMain.handle('set-always-on-top', (_event, flag) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(flag);
    return true;
  }
  return false;
});

// 闪烁任务栏
ipcMain.on('flash-window', () => {
  if (mainWindow) {
    mainWindow.flashFrame(true);
    // 将窗口弹到最前
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
  }
});

// 停止闪烁
ipcMain.on('stop-flash', () => {
  if (mainWindow) {
    mainWindow.flashFrame(false);
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});
