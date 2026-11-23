# 闪耀色彩播放器 (Shiny Stories Player)

> THE IDOLM@STER SHINY COLORS (偶像大师 闪耀色彩) 283PRO 离线中文剧情播放器与全能音乐馆。  
> 跨端支持 Windows（免安装 / 绿色版）与 Android 手机 / 平板 / 鸿蒙系统。

---

## 🌟 核心功能

* **全量收录剧情馆**：收录 283 事务所全部官方偶像剧情、活动剧情、越境时序与主线剧本，内置高质量中文汉化及中日双语字幕切换。
* **283 音乐馆 (Jukebox)**：学马风格黑胶拟真唱片机，全量偶像大师企划曲目在线与本地离线播放，支持多音质引擎（沉浸环绕声、超清母带、极高 HQ、臻音全景声等）。
* **卡面相册与衣装室**：高清卡面画廊、双卡面切换、动态卡面演出播放；支持偶像 3D / Spine 动态衣装模型试听与动作表情调试。
* **全量语音馆**：收录全部角色主界面、私语、电话、组合对话语音与同步字幕，支持直接补译与回填导出。
* **283 VIP 游乐厅**：斗地主、掼蛋 2v2、大富豪等多款内置同台卡牌小游戏。
* **多端适配优化**：
  * **Windows**：支持原生高 DPI（`Ctrl + + / -` 自由无损缩放）、多屏与全屏沉浸播放。
  * **Android**：深度适配 20:9 / 21:9 全面屏与 16:10 / 3:2 平板；专为华为卓易通 / 鸿蒙容器降低能耗，流畅丝滑。

---

## 📦 发行版下载 (Releases)

可在本项目 GitLab 的 **[Releases (发布版)](http://72.765pro.space:8929/root/shiny-stories-player/-/releases)** 页面直接下载各平台已编译安装包：

* **Windows 版**：`ShinyStories-Lite-win32-x64.7z`（约 258 MB，解压即用免安装）
* **Android 版**：`ShinyStories-Android.apk`（约 262 MB，手机 / 平板 / 鸿蒙卓易通均可直接安装）

---

## 🛠️ 本地开发与运行

### 环境需求
* Node.js >= 18
* Windows x64 (运行桌面端) 或 Android SDK / NDK (编译移动端)

### 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务与 Electron 桌面客户端
npm start

# 3. 校验离线资源与汉化状态
node scripts/verify-offline.cjs
node scripts/audit-translation-status.cjs
```

### 构建与打包

```bash
# 构建 Windows 免安装发行包 (.7z)
npm run release

# 构建 Android APK 安装包 (.apk)
node scripts/build-android.cjs
```

---

## 📚 统一技术文档目录

本项目所有开发架构、专题规范与历史维护交接已统一归档于 **[docs/](docs/README.md)** 目录：

* **[系统整体架构 (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)**：技术选型、通信架构与核心数据流。
* **[剧情播放与音乐馆 (docs/PLAYER.md)](docs/PLAYER.md)**：剧本解析、双语字幕、全屏居中排版与音乐引擎。
* **[Android 移动端开发 (docs/ANDROID.md)](docs/ANDROID.md)**：APK 编译、16KB 页对齐、全面屏与鸿蒙卓易通降耗。
* **[怪文书二创与语音口型 (docs/CREATIVE.md)](docs/CREATIVE.md)**：剧情编辑、TTS 语音合成与嘴型动画生成。
* **[实时超分辨率技术 (docs/SUPER_RESOLUTION.md)](docs/SUPER_RESOLUTION.md)**：Anime4K、ArtCNN 与 WebGL 渲染管线。
* **[剧情汉化与翻译对账 (docs/TRANSLATION.md)](docs/TRANSLATION.md)**：翻译对账台账、变更审计与回填导出。
* **[历史交接归档目录 (docs/handover/)](docs/handover/)**：历史版本维护交接记录、日常优化与修复日志。
