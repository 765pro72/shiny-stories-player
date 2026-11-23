# 剧情汉化与翻译对账工作流

本文档说明项目汉化资源同步、翻译审计、状态对账及变更记录规范。

---

## 1. 汉化数据源结构

- **工作目录**：`translation-work/`
- **核心文件**：
  - `translation-work/状态对账.json`: 全量剧本的汉化进度、完成百分比与对账记录。
  - `translation-work/翻译变更日志.jsonl`: 接手维护过程中的每一次单句/批量翻译增量改动（保留 before/after 以便溯源与回滚）。
  - `translation-work/dict/`: 专有名词、角色人名、事务所术语对照字典。

---

## 2. 翻译维护原则

1. **如实记录署名**：
   - 严禁冒领千问或社区译者的汉化成果。
   - 所有由 AI 辅助润色或直接补译的文本，必须完整写入 `翻译变更日志.jsonl`。
2. **严禁虚假声称**：
   - 不得把源站缺失脚本、未下载资源、未匹配卡图或未完成翻译声称为已完成。
3. **日常对账命令**：
   ```bash
   # 检查资源离线完整度
   node scripts/verify-offline.cjs

   # 检查汉化翻译状态与缺句
   node scripts/audit-translation-status.cjs
   ```
