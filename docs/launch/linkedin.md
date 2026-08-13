# LinkedIn Draft

Your coding agents do not read the same repository.

Teams increasingly keep `AGENTS.md`, `CLAUDE.md`, Cursor rules, and GitHub Copilot instructions side by side. Those files are not portable aliases: each product discovers, scopes, and prioritizes repository guidance differently.

I built **Rulefall**, an open-source lifecycle conformance simulator, to make those differences inspectable.

Choose a working directory and target file, move through startup → discovery → edit, and compare Codex, Claude Code, Cursor, and Copilot in one waterfall. Each event explains whether a source is loaded, deferred, ignored, shadowed, or truncated—and how confident the simulation is.

The app runs locally in the browser. There is no repository upload, backend, telemetry, model call, or account.

Rulefall does not reconstruct private prompts or prove that a model followed an instruction. Its job is narrower: make documented delivery mechanics visible enough to test, discuss, and correct.

Planned online simulator: <https://lyrazeta.github.io/rulefall/>

Source: <https://github.com/LyraZeta/rulefall>

I would welcome reproducible edge cases and corrections grounded in current official documentation.

`#opensource` `#developertools` `#aiagents`
