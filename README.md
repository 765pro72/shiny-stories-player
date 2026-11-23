# 闪耀色彩播放器 (Shiny Stories Player)

> THE IDOLM@STER SHINY COLORS (偶像大师 闪耀色彩) 283PRO 离线中文剧情播放器与全能音乐馆。
> 支持 Windows（免安装 / 绿色版）与 Android 手机 / 平板 / 鸿蒙系统。

---

## 🌟 核心功能

- **全量收录剧情馆**：收录 283 事务所全部官方偶像剧情、活动剧情、越境时序与主线剧本，内置高质量中文汉化及中日双语字幕切换。
- **283 音乐馆 (Jukebox)**：学马风格黑胶拟真唱片机，全量偶像大师企划曲目在线与本地离线播放，支持多音质引擎（沉浸环绕声、超清母带、极高 HQ、臻音全景声等）。
- **卡面相册与衣装室**：高清卡面画廊、双卡面切换、动态卡面演出播放；支持偶像 3D / Spine 动态衣装模型试听与动作表情调试。
- **全量语音馆**：收录全部角色主界面、私语、电话、组合对话语音与同步字幕，支持直接补译与回填导出。
- **283 VIP 游乐厅**：斗地主、掼蛋 2v2、大富豪等多款内置同台卡牌小游戏。
- **多端适配优化**：
  - Windows：支持原生高 DPI（`Ctrl + + / -` 自由无损缩放）、多屏与全屏沉浸播放。
  - Android：深度适配 20:9 / 21:9 全面屏与 16:10 / 3:2 平板；专为华为卓易通 / 鸿蒙容器降低能耗，流畅丝滑。

---

## 📦 发行版下载 (Releases)

可在本项目 GitLab 的 **Releases (发布版)** 页面直接下载各平台已编译安装包：
- **Windows 版**：`ShinyStories-Lite-win32-x64.7z`（解压即用）
- **Android 版**：`ShinyStories-Android.apk`（手机 / 平板 / 鸿蒙卓易通均可直接安装）

---

## 🛠️ 本地开发与运行

### 环境需求
- Node.js >= 18
- Windows x64 (运行桌面端) 或 Android SDK / NDK (编译移动端)

### 快速启动
```bash
# 安装依赖
npm install

# 启动本地开发服务与 Electron 桌面客户端
npm start

# 构建 Windows 发布包
npm run release

# 构建 Android APK 安装包
node scripts/build-android.cjs
```
