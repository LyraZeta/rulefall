# Official References

Rulefall's semantic claims should be traceable to primary vendor documentation. This list is reviewed when provider behavior changes; a link does not imply that Rulefall implements every feature described there.

Last reviewed: **August 13, 2026**.

## OpenAI Codex

- [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md/) — discovery order, scope, override/fallback behavior, and instruction-size configuration.
- [Codex configuration reference](https://developers.openai.com/codex/config-reference/) — configuration keys that can affect project document discovery.

## Anthropic Claude Code

- [Manage Claude's memory](https://docs.anthropic.com/en/docs/claude-code/memory) — memory locations, project and user scopes, imports, and loading behavior.
- [Claude Code settings](https://docs.anthropic.com/en/docs/claude-code/settings) — configuration scopes and managed settings that can influence a session.

## Cursor

- [Rules](https://docs.cursor.com/context/rules) — project rules, rule types, MDC metadata, nested rules, and the legacy `.cursorrules` format.
- [Context](https://docs.cursor.com/context) — the broader context model in which rules are selected.

## GitHub Copilot

- [Adding repository custom instructions for GitHub Copilot](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot) — repository-wide and path-specific instruction files, syntax, and product support.
- [About customizing GitHub Copilot responses](https://docs.github.com/en/copilot/customizing-copilot/about-customizing-github-copilot-responses) — available customization mechanisms and their scope.

## Cross-Agent Convention

- [AGENTS.md](https://agents.md/) — the open repository-instruction convention and ecosystem overview. Vendor-specific behavior still comes from the relevant vendor documentation above.

## Adjacent Open-Source Projects

These are primary project pages used only to explain product positioning, not as evidence for vendor semantics:

- [agentoscope](https://github.com/rafaelcg/agentoscope)
- [Scopeglass](https://github.com/zackabrah/scopeglass)
- [agnix](https://github.com/agent-sh/agnix)

## Source Policy

Prefer a current official product document over blog posts, search snippets, generated answers, or a single observed response. If official documentation is silent, record a minimal reproducible observation, label the Rulefall behavior best effort, and include the observation date and product surface. Never promote an inference to exact merely because it appears stable.
