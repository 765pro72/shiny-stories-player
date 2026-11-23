# Android 移动端适配与构建指南

本文档总结 Android 移动端构建体系、16KB 内存页对齐规范及全面屏与华为卓易通性能优化。

---

## 1. 移动端运行原理

Android 客户端基于 **Node.js Mobile (Fogtape fork)** 原生运行时，在移动设备本地运行 Node.js 服务实例，前端通过全屏高刷新率 WebView 进行渲染。

- **运行时支持**：ARM64 (`arm64-v8a`) 与 x86_64 双架构。
- **通信架构**：原生 Android Java Activity 启动 Node.js Mobile 后台线程，通过本地 Loopback 端口（`http://127.0.0.1:PORT`）提供静态资源服务与剧情反代。

---

## 2. 核心适配与优化规范

1. **屏幕比例与全屏适配**：
   - 深度适配主流手机全面屏（`20:9`、`21:9`）与平板比例（`16:10`、`3:2`）。
   - 界面严格支持 SafeArea 安全区避让（水滴屏/灵动岛/挖孔打孔屏）。
   - 沉浸全屏播放模式下自动隐藏系统状态栏与虚拟导航键。
2. **华为卓易通 / 鸿蒙系统（JoyTrans）能耗降耗优化**：
   - **禁止重度 `backdrop-filter` 全屏读回**：避免在 GPU 弱算力容器环境中引发严重掉帧与发热。
   - **禁止高频 Canvas/WebGL 内存重复分配**：纹理缓存复用，限制最大显存驻留。
   - 移动端默认关闭高负载超分着色器，切换为轻量级双三次插值。
3. **16KB 内存页对齐（Android 15+ 强制要求）**：
   - 所有预编译的 `.so` 动态链接库（`libnode.so`、`libnative-lib.so` 等）必须严格按照 `16384 (16KB)` 边界进行 ELF 对齐。
   - `build-android.cjs` 在打包后会自动调用 `zipalign -c -P 16 4` 严格校验，任何对齐失败均直接阻断发版。

---

## 3. 构建流程

执行以下命令即可全自动编译打包并生成签名 APK：

```bash
node scripts/build-android.cjs
```

产出文件：[`dist/ShinyStories-Android.apk`](file:///f:/sc/dist/ShinyStories-Android.apk)
- 包含自动 SHA-256 完整性摘要与 v3 证书签名。
- 支持在 Android 9.0 至 Android 15+ 移动设备及鸿蒙系统上直接安装运行。
