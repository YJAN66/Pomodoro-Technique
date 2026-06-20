// ========================================
// 番茄钟 v2.0 — 核心逻辑
// ========================================

// ---- 常量 ----
const CIRCUMFERENCE = 2 * Math.PI * 98; // 新环形周长 (r=98) ≈ 615.75

const DEFAULT_TIMES = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
};

const TIME_RANGES = {
  work: { min: 1, max: 60 },
  shortBreak: { min: 1, max: 30 },
  longBreak: { min: 5, max: 45 },
};

const DEFAULT_COLORS = {
  work: '#e74c3c',
  shortBreak: '#2ecc71',
  longBreak: '#3498db',
};

const MODE_META = {
  work: { label: '专注', icon: '🍅', color: '#e74c3c' },
  shortBreak: { label: '短休', icon: '☕', color: '#2ecc71' },
  longBreak: { label: '长休', icon: '🌟', color: '#3498db' },
};

const STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
};

// ---- DOM 元素 ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const ringProgress = $('.ring-progress');
const timerMinutes = $('.timer-minutes');
const timerSeconds = $('.timer-seconds');
const statusText = $('#statusText');
const btnStart = $('#btnStart');
const btnPause = $('#btnPause');
const btnReset = $('#btnReset');
const btnSkip = $('#btnSkip');
const btnPin = $('#btnPin');
const btnSettings = $('#btnSettings');
const btnStats = $('#btnStats');
const countDots = $('#countDots');
const countLabel = $('#countLabel');
const modeTabs = $$('.mode-tab');
const timerRingContainer = $('#timerRingContainer');
const settingsPanel = $('#settingsPanel');
const statsPanel = $('#statsPanel');
const completionOverlay = $('#completionOverlay');
const completionEmoji = $('#completionEmoji');
const completionTitle = $('#completionTitle');
const completionSubtitle = $('#completionSubtitle');
const completionDismiss = $('#completionDismiss');
const toast = $('#toast');
const taskLabel = $('#taskLabel');
const taskIcon = $('.task-icon');
const autoStartToggle = $('#autoStartToggle');
const tickMarks = $('#tickMarks');

// ---- 状态 ----
let currentMode = 'work';
let timerState = STATES.IDLE;
let totalSeconds = DEFAULT_TIMES.work * 60;
let remainingSeconds = totalSeconds;
let intervalId = null;
let pomodoroCount = 0;
let isPinned = false;
let settingsOpen = false;
let statsOpen = false;
let completionOverlayTimeout = null;

// 自定义时间（从 localStorage 加载）
let customTimes = { ...DEFAULT_TIMES };

// 累计统计（从 localStorage 加载）
let stats = {
  todayFocusSeconds: 0,
  todayDate: '',
  weeklyMinutes: [0, 0, 0, 0, 0, 0, 0], // Sun-Sat
  bestDay: { date: '', minutes: 0 },
};

// ---- 初始化 ----
function init() {
  loadSettings();
  loadStats();
  loadTaskLabel();

  // 绘制刻度标记
  drawTickMarks();

  setMode('work');
  updateDisplay();
  updateProgressRing();
  renderPomodoroDots();
  updateTray();

  // 恢复任务图标
  updateTaskIcon();
}

// ---- 刻度标记 ----
function drawTickMarks() {
  const cx = 110, cy = 110, r = 98;
  let html = '';
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const len = isMajor ? 6 : 3;
    const x1 = cx + (r - 10) * Math.cos(angle);
    const y1 = cy + (r - 10) * Math.sin(angle);
    const x2 = cx + (r - 10 - len) * Math.cos(angle);
    const y2 = cy + (r - 10 - len) * Math.sin(angle);
    const opacity = isMajor ? 0.4 : 0.15;
    html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
      class="tick-mark" style="opacity:${opacity}" />`;
  }
  tickMarks.innerHTML = html;
}

// ---- 设置面板 ----
function toggleSettings() {
  settingsOpen = !settingsOpen;
  settingsPanel.classList.toggle('open', settingsOpen);
  btnSettings.classList.toggle('active', settingsOpen);

  // 关闭统计面板
  if (settingsOpen && statsOpen) toggleStats();
}

function updateSettingsUI() {
  $('#workVal').textContent = customTimes.work;
  $('#shortBreakVal').textContent = customTimes.shortBreak;
  $('#longBreakVal').textContent = customTimes.longBreak;
}

function adjustTime(mode, dir) {
  const range = TIME_RANGES[mode];
  const newVal = customTimes[mode] + dir * 1;
  if (newVal < range.min || newVal > range.max) return;

  customTimes[mode] = newVal;
  updateSettingsUI();
  saveSettings();

  // 如果当前模式被修改，立即更新计时器
  if (mode === currentMode && timerState === STATES.IDLE) {
    totalSeconds = customTimes[mode] * 60;
    remainingSeconds = totalSeconds;
    updateDisplay();
    updateProgressRing();
    updateTray();
  }
}

function resetDefaults() {
  customTimes = { ...DEFAULT_TIMES };
  updateSettingsUI();
  saveSettings();

  if (timerState === STATES.IDLE) {
    totalSeconds = customTimes[currentMode] * 60;
    remainingSeconds = totalSeconds;
    updateDisplay();
    updateProgressRing();
    updateTray();
  }

  showToast('已恢复默认设置');
}

function saveSettings() {
  localStorage.setItem('pomodoro-custom-times', JSON.stringify(customTimes));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('pomodoro-custom-times'));
    if (saved) {
      customTimes.work = saved.work || DEFAULT_TIMES.work;
      customTimes.shortBreak = saved.shortBreak || DEFAULT_TIMES.shortBreak;
      customTimes.longBreak = saved.longBreak || DEFAULT_TIMES.longBreak;
    }
  } catch (e) {
    customTimes = { ...DEFAULT_TIMES };
  }
  updateSettingsUI();
}

// ---- 自动开始 ----
function isAutoStartEnabled() {
  return autoStartToggle.checked;
}

// 保存自动开始设置
autoStartToggle.addEventListener('change', () => {
  localStorage.setItem('pomodoro-auto-start', autoStartToggle.checked ? '1' : '0');
});

function loadAutoStart() {
  const val = localStorage.getItem('pomodoro-auto-start');
  autoStartToggle.checked = val === '1';
}

// ---- 任务标签 ----
function updateTaskIcon() {
  taskIcon.textContent = MODE_META[currentMode].icon;
}

taskLabel.addEventListener('blur', () => {
  saveTaskLabel();
});

taskLabel.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    taskLabel.blur();
  }
});

function saveTaskLabel() {
  const text = taskLabel.textContent.trim();
  localStorage.setItem('pomodoro-task-' + currentMode, text);
}

function loadTaskLabel() {
  const text = localStorage.getItem('pomodoro-task-' + currentMode);
  if (text) {
    taskLabel.textContent = text;
  } else {
    taskLabel.textContent = '';
  }
}

// ---- 统计面板 ----
function toggleStats() {
  statsOpen = !statsOpen;
  statsPanel.classList.toggle('open', statsOpen);
  btnStats.classList.toggle('active', statsOpen);

  // 关闭设置面板
  if (statsOpen && settingsOpen) toggleSettings();

  if (statsOpen) updateStatsUI();
}

function updateStatsUI() {
  // 今日专注时长
  const totalMin = Math.floor(stats.todayFocusSeconds / 60);
  $('#statTodayFocus').textContent = `${totalMin} 分钟`;

  // 今日番茄数
  $('#statTodayPomos').textContent = `${pomodoroCount} 个`;

  // 本周累计
  const weekTotal = stats.weeklyMinutes.reduce((a, b) => a + b, 0);
  $('#statWeekFocus').textContent = `${weekTotal} 分钟`;

  // 历史最佳
  if (stats.bestDay.minutes > 0) {
    $('#statBestDay').textContent = `${stats.bestDay.date} · ${stats.bestDay.minutes} 分钟`;
  } else {
    $('#statBestDay').textContent = '--';
  }

  // 周趋势图
  renderWeekChart();
}

function renderWeekChart() {
  const maxVal = Math.max(...stats.weeklyMinutes, 1);
  const today = new Date().getDay(); // 0=Sun
  const labels = ['日', '一', '二', '三', '四', '五', '六'];

  let html = '';
  for (let i = 0; i < 7; i++) {
    const h = Math.max(3, Math.round((stats.weeklyMinutes[i] / maxVal) * 52));
    const isToday = i === today;
    html += `<div class="week-bar-wrap">
      <div class="week-bar${isToday ? ' today' : ''}" style="height:${h}px"></div>
      <span class="week-bar-label">${labels[i]}</span>
    </div>`;
  }
  $('#weekChart').innerHTML = html;
}

function recordFocusSession(seconds) {
  const today = new Date();
  const todayStr = today.toDateString();
  const dayOfWeek = today.getDay();

  // 日期变化重置
  if (stats.todayDate !== todayStr) {
    stats.todayFocusSeconds = 0;
    stats.todayDate = todayStr;
  }

  stats.todayFocusSeconds += seconds;
  stats.weeklyMinutes[dayOfWeek] = Math.round(stats.todayFocusSeconds / 60);

  // 历史最佳
  const todayMin = Math.round(stats.todayFocusSeconds / 60);
  if (todayMin > stats.bestDay.minutes) {
    stats.bestDay = { date: todayStr, minutes: todayMin };
  }

  saveStats();
  if (statsOpen) updateStatsUI();
}

function saveStats() {
  localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
}

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem('pomodoro-stats'));
    if (saved) {
      stats = { ...stats, ...saved };
    }
  } catch (e) {
    // keep defaults
  }

  // 新的一天重置今日数据
  const today = new Date().toDateString();
  if (stats.todayDate !== today) {
    stats.todayFocusSeconds = 0;
    stats.todayDate = today;
  }

  loadAutoStart();
}

// ---- 模式切换 ----
function setMode(mode) {
  currentMode = mode;
  totalSeconds = customTimes[mode] * 60;
  remainingSeconds = totalSeconds;
  timerState = STATES.IDLE;
  clearInterval(intervalId);
  intervalId = null;

  ringProgress.className = 'ring-progress ' + mode;
  timerRingContainer.className = 'timer-ring-container ' + mode;
  updateDisplay();
  updateProgressRing();
  updateButtons();
  updateStatus();
  updateTaskIcon();
  loadTaskLabel();
  timerRingContainer.classList.remove('finished');
  document.body.classList.remove('window-pulse');

  modeTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  // 停止托盘闪烁
  if (window.electronAPI) {
    window.electronAPI.stopFlash();
  }

  stopFlashLoop();
  updateTray();
}

// ---- 计时器逻辑 ----
function startTimer() {
  if (timerState === STATES.RUNNING) return;

  timerState = STATES.RUNNING;
  timerRingContainer.classList.add('running');
  updateButtons();
  updateStatus();
  updateTray();

  intervalId = setInterval(() => {
    remainingSeconds--;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      timerComplete();
    }

    updateDisplay();
    updateProgressRing();
    updateTray();
  }, 1000);
}

function pauseTimer() {
  if (timerState !== STATES.RUNNING) return;

  timerState = STATES.PAUSED;
  clearInterval(intervalId);
  intervalId = null;
  timerRingContainer.classList.remove('running');
  updateButtons();
  updateStatus();
  updateTray();
}

function resetTimer() {
  timerState = STATES.IDLE;
  clearInterval(intervalId);
  intervalId = null;
  remainingSeconds = totalSeconds;
  timerRingContainer.classList.remove('running', 'finished');
  document.body.classList.remove('window-pulse');
  updateDisplay();
  updateProgressRing();
  updateButtons();
  updateStatus();
  updateTray();
  stopFlashLoop();
}

function skipTimer() {
  remainingSeconds = 0;
  timerComplete();
}

// ---- 计时完成 ----
let flashLoopId = null;

function stopFlashLoop() {
  if (flashLoopId) {
    clearInterval(flashLoopId);
    flashLoopId = null;
  }
  if (window.electronAPI) {
    window.electronAPI.stopFlash();
  }
}

function timerComplete() {
  clearInterval(intervalId);
  intervalId = null;
  timerState = STATES.IDLE;
  timerRingContainer.classList.remove('running');

  // 播放增强音频
  playCompletionSound(currentMode);

  // 记录统计
  if (currentMode === 'work') {
    pomodoroCount++;
    savePomodoroCount();
    renderPomodoroDots();
    recordFocusSession(customTimes.work * 60);

    // 番茄计数动画
    animatePomodoroCount();
  }

  // 显示完成覆盖层
  showCompletionOverlay();

  // 窗口脉冲动画
  document.body.classList.add('window-pulse');
  setTimeout(() => document.body.classList.remove('window-pulse'), 600);

  // 闪烁任务栏 + 弹到最前
  if (window.electronAPI) {
    window.electronAPI.flashWindow();
  }

  // 系统通知
  if (currentMode === 'work') {
    notify('🍅 专注完成！', `太棒了，完成了 ${customTimes.work} 分钟的专注~`);
    showToast(`🎉 ${customTimes.work} 分钟专注完成！`);
  } else if (currentMode === 'shortBreak') {
    notify('☕ 短休结束', '准备好开始下一个番茄了吗？');
    showToast('☕ 短休时间到，开始专注吧！');
  } else if (currentMode === 'longBreak') {
    notify('🌟 长休结束', '精力充沛，开始新的番茄周期！');
    showToast('🌟 长休结束，元气满满！');
  }

  // 自动切换到下一个模式
  const nextMode = getNextMode();
  setMode(nextMode);

  // 自动开始
  if (isAutoStartEnabled()) {
    setTimeout(() => {
      startTimer();
    }, 2500);
  }

  // 脉冲动画
  timerRingContainer.classList.add('finished');
  setTimeout(() => {
    timerRingContainer.classList.remove('finished');
  }, 4000);

  updateButtons();
  updateTray();
}

function getNextMode() {
  if (currentMode === 'work') {
    if (pomodoroCount > 0 && pomodoroCount % 4 === 0) {
      return 'longBreak';
    }
    return 'shortBreak';
  }
  return 'work';
}

// ---- 完成覆盖层 ----
function showCompletionOverlay() {
  const meta = MODE_META[currentMode];
  const nextMode = getNextMode();
  const nextMeta = MODE_META[nextMode];

  completionEmoji.textContent = meta.icon;
  completionTitle.textContent = `${meta.label}完成！`;
  completionSubtitle.textContent = `接下来：${nextMeta.icon} ${nextMeta.label}`;

  clearTimeout(completionOverlayTimeout);
  completionOverlay.classList.add('show');

  completionOverlayTimeout = setTimeout(() => {
    hideCompletionOverlay();
  }, 4000);
}

function hideCompletionOverlay() {
  completionOverlay.classList.remove('show');
  clearTimeout(completionOverlayTimeout);
  stopFlashLoop();
}

completionDismiss.addEventListener('click', hideCompletionOverlay);
completionOverlay.addEventListener('click', (e) => {
  if (e.target === completionOverlay) hideCompletionOverlay();
});

// ---- Toast ----
let toastTimeout = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ---- 番茄计数动画 ----
function animatePomodoroCount() {
  // 短暂的缩放弹跳（通过 countLabel）
  countLabel.style.transform = 'scale(1.2)';
  countLabel.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  setTimeout(() => {
    countLabel.style.transform = 'scale(1)';
  }, 200);
}

// ---- 显示更新 ----
function updateDisplay() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  timerMinutes.textContent = String(mins).padStart(2, '0');
  timerSeconds.textContent = String(secs).padStart(2, '0');
}

function updateProgressRing() {
  const progress = remainingSeconds / totalSeconds;
  const offset = CIRCUMFERENCE * (1 - progress);
  ringProgress.style.strokeDashoffset = offset;
}

function updateButtons() {
  if (timerState === STATES.RUNNING) {
    btnStart.style.display = 'none';
    btnPause.style.display = 'flex';
  } else {
    btnStart.style.display = 'flex';
    btnPause.style.display = 'none';
  }
}

function updateStatus() {
  const meta = MODE_META[currentMode];
  if (timerState === STATES.IDLE) {
    statusText.textContent = `准备开始${meta.label}`;
  } else if (timerState === STATES.RUNNING) {
    statusText.textContent = `正在${meta.label}中…`;
  } else if (timerState === STATES.PAUSED) {
    statusText.textContent = '已暂停';
  }
}

function updateTray() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isRunning = timerState === STATES.RUNNING;
  const phaseLabel = MODE_META[currentMode].label;

  if (window.electronAPI) {
    window.electronAPI.updateTimer(timeText, phaseLabel, isRunning);
  }
}

// ---- 番茄计数显示 ----
function renderPomodoroDots() {
  const maxDots = 8;
  countDots.innerHTML = '';

  const displayCount = pomodoroCount % maxDots === 0 && pomodoroCount > 0
    ? maxDots : pomodoroCount % maxDots;

  for (let i = 0; i < maxDots; i++) {
    const dot = document.createElement('div');
    dot.className = 'count-dot';
    if (i < displayCount) {
      dot.classList.add('completed');
    }
    if (currentMode === 'work' && timerState === STATES.RUNNING && i === displayCount) {
      dot.classList.add('current');
    }
    countDots.appendChild(dot);
  }

  countLabel.textContent = `今日 ${pomodoroCount} 个番茄`;
}

function savePomodoroCount() {
  const today = new Date().toDateString();
  localStorage.setItem('pomodoro-date', today);
  localStorage.setItem('pomodoro-count', pomodoroCount);
}

function loadPomodoroCount() {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem('pomodoro-date');

  if (savedDate === today) {
    pomodoroCount = parseInt(localStorage.getItem('pomodoro-count')) || 0;
  } else {
    pomodoroCount = 0;
    localStorage.removeItem('pomodoro-date');
    localStorage.removeItem('pomodoro-count');
  }

  renderPomodoroDots();
}

// ---- 通知 ----
function notify(title, body) {
  if (window.electronAPI) {
    window.electronAPI.notify(title, body);
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

// ---- 音频提示 (增强版) ----
function playCompletionSound(mode) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const isWork = mode === 'work';
    // 工作完成：欢快的上升旋律；休息结束：温和的提醒
    const notes = isWork
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51] // C5, E5, G5, C6, E6
      : [783.99, 659.25, 523.25, 392.00, 523.25]; // G5, E5, C5, G4, C5

    const noteDuration = 0.18;
    const volume = 0.45;
    const startTime = audioCtx.currentTime;

    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      // 交替波形让声音更丰富
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;

      const t = startTime + i * noteDuration;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + noteDuration * 1.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t);
      osc.stop(t + noteDuration * 1.5);
    });

    setTimeout(() => audioCtx.close(), 2000);
  } catch (e) {
    // 静默处理
  }
}

// ---- 窗口置顶 ----
async function togglePin() {
  isPinned = !isPinned;
  btnPin.classList.toggle('active', isPinned);

  if (window.electronAPI) {
    await window.electronAPI.setAlwaysOnTop(isPinned);
  }
}

// ---- 事件监听 ----

// 控制按钮
btnStart.addEventListener('click', startTimer);
btnPause.addEventListener('click', pauseTimer);
btnReset.addEventListener('click', resetTimer);
btnSkip.addEventListener('click', skipTimer);
btnPin.addEventListener('click', togglePin);

// 设置
btnSettings.addEventListener('click', toggleSettings);

// 模式标签
modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setMode(tab.dataset.mode);
    // 点击模式标签时关闭面板
    if (settingsOpen) toggleSettings();
    if (statsOpen) toggleStats();
  });
});

// 时间调节按钮
$$('.adj-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    adjustTime(btn.dataset.target, parseInt(btn.dataset.dir));
  });
});

// 重置默认
$('#btnResetDefaults').addEventListener('click', resetDefaults);

// 统计按钮
btnStats.addEventListener('click', toggleStats);

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  // 不在输入框中时响应快捷键
  if (document.activeElement === taskLabel) return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (timerState === STATES.RUNNING) {
      pauseTimer();
    } else {
      startTimer();
    }
  } else if (e.code === 'KeyR') {
    e.preventDefault();
    resetTimer();
  } else if (e.code === 'KeyS') {
    e.preventDefault();
    skipTimer();
  }
});

// 托盘菜单事件
if (window.electronAPI) {
  window.electronAPI.onTrayToggle(() => {
    if (timerState === STATES.RUNNING) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  window.electronAPI.onTrayReset(() => {
    resetTimer();
  });
}

// ---- 启动 ----
init();
