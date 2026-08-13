# Reddit Draft

## Suggested Communities

Choose only a community where open-source developer tooling and self-posts are currently allowed. Read its rules immediately before posting. Do not post the same draft to several subreddits in quick succession.

## Title

I made a local simulator for seeing how Codex, Claude Code, Cursor, and Copilot resolve repo instructions

## Body

Disclosure: I built this.

I kept running into a portability problem: a repo can contain `AGENTS.md`, `CLAUDE.md`, Cursor rules, and Copilot instructions, but each coding agent discovers and scopes them differently. A file being present does not mean it reaches the agent at the same moment—or at all.

Rulefall lets you import a folder/ZIP, select the working directory and target file, and scrub through startup, discovery, and edit. It shows a side-by-side waterfall for four agents and explains why each source is loaded, deferred, ignored, shadowed, or truncated.

Everything runs locally in the browser: no repository upload, backend, telemetry, model call, or account.

It is deliberately not another inventory/linter. It simulates documented delivery semantics, labels uncertainty, and cannot prove instruction compliance or inspect hidden prompts.

Planned online simulator: <https://lyrazeta.github.io/rulefall/>

Source: <https://github.com/LyraZeta/rulefall>

I am looking for two kinds of feedback: small repos that expose a surprising cross-agent difference, and official docs/reproductions where the current model is wrong.
