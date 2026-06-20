# 🍅 Pomodoro Timer — 桌面番茄钟

基于 **Electron** 的跨平台桌面番茄钟应用，采用深色主题 UI，支持自定义时间、任务标签、统计面板，计时结束弹窗强提醒。

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🍅 专注模式 | 默认 25 分钟专注 + 5 分钟短休 + 15 分钟长休（每 4 轮） |
| ⚙️ 自定义时长 | 自由调整三种模式的时长，自动持久化保存 |
| 📝 任务标签 | 点击即可编辑当前专注任务名称 |
| 📊 统计面板 | 今日专注时长、番茄数、本周趋势柱状图、历史最佳 |
| 🔔 强提醒 | 计时结束：全屏覆盖层 + 任务栏闪烁 + 窗口弹前 + 音频提示 |
| 🔄 自动开始 | 可选开关，计时结束自动进入下一阶段 |
| 📌 窗口置顶 | 一键置顶，专注不被打扰 |
| 📟 系统托盘 | 最小化到托盘，右键菜单快捷控制，显示剩余时间 |
| ⌨️ 快捷键 | Space 暂停/开始 · R 重置 · S 跳过 |

## 🖥️ 界面预览

```
┌─────────────────────────────┐
│    [ 专注 ] [ 短休 ] [ 长休 ]  │
│                             │
│      ╭───────────╮          │
│     ╱  ◉  ◉  ◉   ╲         │
│    │   24:59       │        │
│     ╲  ◉  ◉  ◉   ╱         │
│      ╰───────────╯          │
│     ✏️ 写周报...              │
│      准备开始专注               │
│    [↺]  [▶]  [⏭]            │
│   ●●●●○○○○  今日 4 个番茄      │
│   📌      Space暂停 · R重置    │
└─────────────────────────────┘
```

## 🚀 安装使用

### 直接安装（Windows）

下载 [最新 Release](https://github.com/YJAN66/Pomodoro-Technique/releases) 中的 `番茄钟 Setup x.x.x.exe`，双击安装。

### 从源码运行

```bash
git clone https://github.com/YJAN66/Pomodoro-Technique.git
cd Pomodoro-Technique
npm install
npm start
```

### 打包为安装程序

```bash
npm run dist
# 输出: dist/番茄钟 Setup x.x.x.exe
```

## ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 开始 / 暂停 |
| `R` | 重置当前计时 |
| `S` | 跳过当前阶段 |

## 🛠️ 技术栈

- **Electron** — 桌面框架
- **原生 HTML/CSS/JS** — 零依赖前端
- **SVG** — 环形进度条 + 渐变 + 发光滤镜
- **Web Audio API** — 计时结束提示音
- **electron-builder** — 打包分发

## 📁 项目结构

```
├── main.js              # Electron 主进程（窗口、托盘、通知）
├── preload.js           # 安全 IPC 桥接
├── start.js             # 启动器（环境兼容）
├── index.html           # 主界面
├── style.css            # 深色主题样式
├── renderer.js          # 番茄钟核心逻辑
├── assets/
│   └── icon.png         # 应用图标
├── scripts/
│   └── generate-icon.js # 图标生成脚本
└── package.json         # 项目配置
```

## 📄 License

MIT © Pomodoro Timer
