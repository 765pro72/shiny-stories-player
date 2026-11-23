# 给接手本项目的 AI

先阅读 [维护交接-2026-10-16.md](维护交接-2026-10-16.md)（最新状态：本轮已完成/未完成、剩余工作与操作要点），再读 [维护交接.md](维护交接.md)（2026-10-15 的旧快照，数字已过期）。然后运行 `node scripts/verify-offline.cjs` 与 `node scripts/audit-translation-status.cjs` 查看实际资源与翻译状态；所有文档数字都以现场文件为准。

用户的目标是非官方 Windows 离线中文剧情播放器的可分享文件夹/ZIP、后续公开资料更新，以及翻译和润色。**翻译归属要说实话**：2026-10-16 起由接手 AI 直接翻译/润色（用户 m00944 授权"算了，你自己干吧"），必须写入 `translation-work/翻译变更日志.jsonl` 保留 before/after 以便回滚，不得冒领千问或社区译者的成果。发布前必须经过 `npm run release` 门禁；不得把源站缺失脚本、未下载资源、未匹配卡图或未完成的翻译声称为已完成。保留官方画风和现有译者署名。

当前核心入口：`desktop.cjs`（Electron）、`server.cjs`（资源服务）、`updater.cjs`（公开数据更新）、`public/`（界面和播放器）、`scripts/cache-all.cjs`（镜像）、`scripts/release.cjs`（发布）、`scripts/build-android.cjs`（Android APK）。

**多端适配长期要求**：后续每次界面或功能更新，必须同步适配并检查 **手机（20:9 / 21:9 全面屏）**、**平板（16:10 / 3:2）** 以及 **华为卓易通（JoyTrans / 鸿蒙容器性能降耗，避免重度 backdrop-filter 读回与高频 Canvas 分配）**，并同步产出 Windows 发布包与 `dist/ShinyStories-Android.apk`。

**不要碰**：`cache-sr/`、`upscale-work/`、`upscale-pilot/`、`tools/upscaler/`、`scripts/upscale-*.cjs` —— 用户明确"超分辨率是 gpt 的工作"（m00649）。
