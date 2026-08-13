# V2EX 发布草稿

## 标题

[分享创造] Rulefall：对比 Codex / Claude Code / Cursor / Copilot 到底读到了哪些仓库指令

## 正文

这是我做的开源项目，先做利益相关声明。

最近在同时使用几种 coding agent 时遇到一个很隐蔽的问题：同一个仓库里的 `AGENTS.md`、`CLAUDE.md`、Cursor rules 和 Copilot instructions，并不会以相同的时机和作用域进入不同代理的上下文。

所以做了 Rulefall。导入本地目录或 ZIP，选定 cwd 和目标文件，然后从 startup → discovery → edit 拖动时间轴，就能并排看到四种代理的加载瀑布。每条事件会说明来源、阶段、loaded/deferred/ignored 等状态、原因和置信度。

所有分析都在浏览器本地完成，没有仓库上传、后端、遥测、账号或模型 API 调用。

它不是 inventory 或 linter，也看不到厂商隐藏 prompt，更不能证明模型遵从指令。目标只是把有官方证据的“指令送达语义”做成可检查、可纠错的模型。

在线体验：<https://lyrazeta.github.io/rulefall/>

源码：<https://github.com/LyraZeta/rulefall>

目前是 v0.1，最希望收到两类反馈：一是能暴露跨代理差异的最小仓库样例，二是模拟结果与最新官方行为不一致的可复现情况。

发布前请确认 V2EX 当前节点规则并选择真正相关的节点，只发布一次，不顶帖刷屏。
