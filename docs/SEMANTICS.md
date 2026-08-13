# Semantics And Confidence

This document defines what a Rulefall v0.1 result means. It is the contract behind the UI language; when the implementation and this document disagree, treat that as a bug.

Last reviewed: **August 13, 2026**.

## The Modeled Question

For a repository snapshot, working directory, target path, lifecycle phase, and provider, Rulefall asks:

> Which recognized repository instruction sources would be considered by this point, and why would each source be loaded, deferred, ignored, shadowed, or truncated?

Rulefall models **instruction delivery mechanics**. It does not model instruction quality, model attention, final compliance, or hidden prompts.

## Lifecycle

The three phases are an explanatory common timeline, not vendor terminology:

| Phase | Rulefall definition |
| --- | --- |
| `startup` | Information available from the launch location and immediately discovered repository/root configuration. |
| `discovery` | Information encountered as the agent establishes repository or directory scope. |
| `edit` | Information whose applicability can only be decided after a concrete target path or edit context is known. |

Provider behavior is projected onto this shared timeline so products can be compared. A product may internally discover or refresh context at different moments.

## Resolution Actions

| Action | Contract |
| --- | --- |
| `loaded` | The source is recognized, is in modeled scope, and is available by the selected phase. |
| `deferred` | The source is recognized but awaits a later phase or does not match the current target/scope. |
| `ignored` | The source is not part of this provider's modeled dialect or supported surface. |
| `shadowed` | The source is recognized but displaced by a modeled nearer or explicit override. |
| `truncated` | The source is recognized but only a prefix fits a documented or explicitly declared simulation budget. |

“Loaded” is not evidence that a model attended to or followed the content.

## Confidence

| Confidence | Required evidence |
| --- | --- |
| `exact` | A stable, explicit official rule maps directly to the simulated result. |
| `conditional` | Official behavior depends on mode, setting, matcher, invocation, client, or other runtime state not fully represented by the input. |
| `best-effort` | Public documentation is incomplete at the modeled level; the approximation is identified and must not be presented as a vendor guarantee. |

A provider change can lower confidence even before the simulation is updated. Please file a [semantic gap](https://github.com/LyraZeta/rulefall/issues/new?template=semantic-gap.yml) with an official source or reproducible observation.

## v0.1 Provider Profiles

### OpenAI Codex

Recognized sources: `AGENTS.md` and `AGENTS.override.md`.

The intended model follows Codex's documented startup discovery: user-level guidance is considered separately, then repository guidance is assembled from the project root toward the current working directory, with nearer instructions later in the chain. Rulefall v0.1 visualizes repository files only. It does not import user-level Codex configuration, custom fallback filenames, or live configuration values. Where the UI cannot reproduce documented byte-limit or override details exactly, it must mark the claim conditional or best effort.

### Claude Code

Recognized source: repository `CLAUDE.md` files.

Rulefall models project memory in the working directory and its ancestors as available at startup. Memory below the working directory is loaded on demand when Claude reads files in those subtrees. It excludes user memory, enterprise managed policy, `CLAUDE.local.md`, imports, automatic memory, and mode-specific prompt behavior in v0.1. Because official Claude Code behavior has several memory scopes and loading paths, claims beyond repository-local discovery are conditional.

### Cursor

Recognized sources: `.cursor/rules/*.mdc` and the deprecated root `.cursorrules` format.

Rulefall models a project rule's visible metadata and target relationship when an edit path is known. Root always-on MDC rules are placed at `startup`, nested always-on rules at `discovery`, and glob, agent-requested, or manual rules at `edit`. Cursor supports rule types whose inclusion may be always-on, path matched, manually attached, or selected by an agent using a description. Model-selected or agent-requested attachment cannot be predicted deterministically from repository contents alone and must be conditional. A root `.cursorrules` file is represented as deprecated legacy startup guidance with `conditional` confidence; nested `.cursorrules` files are not part of the v0.1 profile.

### GitHub Copilot

Recognized sources: `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md`.

Rulefall models repository-wide instructions at repository discovery and path-specific instructions after a target is known. Path applicability is based on the documented `applyTo` concept, but support and combination behavior vary across Copilot products and modes. A result is therefore conditional unless the selected surface's official documentation gives an exact guarantee represented by the simulator.

## Explicit Non-Goals

Rulefall does not:

- show or reconstruct vendor system/developer prompts;
- connect to a running agent to inspect its context window;
- prove that text was tokenized, attended to, or obeyed;
- lint prose, validate every config field, or recommend instruction wording;
- execute repository instructions, scripts, hooks, MCP servers, or plugins;
- represent user, organization, enterprise, remote, or managed instructions in v0.1;
- guarantee parity with undocumented behavior or future provider releases.

## Estimates And Scores

Byte counts measure imported text. Token counts use a transparent approximation and are not model-specific billing figures. Portability summarizes how broadly recognized sources are loaded across the four simulated providers for the current state. It is not a repository grade, security score, or prediction of coding quality.

## Updating Semantics

A semantic change should include an official reference, focused fixture/test, confidence decision, and changelog entry when user-visible. Observed behavior without official documentation may be represented as best effort if the reproduction is recorded, but it must remain distinguishable from a documented guarantee.
