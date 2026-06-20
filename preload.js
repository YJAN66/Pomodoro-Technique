const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 更新托盘
  updateTimer: (timeText, phaseLabel, isRunning) => {
    ipcRenderer.send('timer-update', { timeText, phaseLabel, isRunning });
  },
  // 发送系统通知
  notify: (title, body) => {
    ipcRenderer.send('send-notification', { title, body });
  },
  // 设置窗口置顶
  setAlwaysOnTop: (flag) => {
    return ipcRenderer.invoke('set-always-on-top', flag);
  },
  // 闪烁任务栏 + 弹到最前
  flashWindow: () => {
    ipcRenderer.send('flash-window');
  },
  // 停止闪烁
  stopFlash: () => {
    ipcRenderer.send('stop-flash');
  },
  // 接收托盘菜单事件
  onTrayToggle: (callback) => {
    ipcRenderer.on('tray-toggle', callback);
  },
  onTrayReset: (callback) => {
    ipcRenderer.on('tray-reset', callback);
  },
});
