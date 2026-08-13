# Hacker News Draft

## Title

Show HN: Rulefall – See which repo instructions reach each coding agent, when and why

## Text

I built Rulefall after noticing that the same repository can give Codex, Claude Code, Cursor, and Copilot materially different instructions.

An `AGENTS.md`, nested `CLAUDE.md`, Cursor `.mdc` rule, and Copilot path instruction differ in discovery timing, scope, and precedence. Existing tools do a good job at inventory or linting; I wanted to inspect the lifecycle itself.

Rulefall is a static browser simulator. Pick a working directory and target file, scrub through startup → discovery → edit, and it produces a four-agent waterfall with loaded/deferred/ignored events and an explanation for each result.

Repository files stay in the browser. There is no backend, telemetry, model call, or account. It includes a demo, folder picker, ZIP fallback, and PNG export.

Important limitation: it models documented instruction delivery; it cannot see private system prompts or prove a model obeyed an instruction. Conditional and best-effort semantics are labeled, and the official sources are linked.

Demo: <https://lyrazeta.github.io/rulefall/>

Source: <https://github.com/LyraZeta/rulefall>

I would especially value corrections from people who maintain agent tooling or have reproducible cases where current product behavior differs from the documented model.

## Before Posting

Confirm that Show HN's current guidelines allow the submission, the demo has no sign-in barrier, and you can stay present to answer technical questions. Post once.
