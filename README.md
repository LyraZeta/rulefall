<div align="center">
  <img src="public/logo.svg" alt="Rulefall" width="520">

  <h3>Your coding agents do not read the same repo.</h3>
  <p><strong>See which instructions reach your coding agent, when, and why.</strong></p>

  <p>
    <a href="https://lyrazeta.github.io/rulefall/"><strong>Planned online simulator</strong></a>
    · <a href="#quick-start">Run locally</a>
    · <a href="docs/SEMANTICS.md">Semantics</a>
    · <a href="README.zh-CN.md">简体中文</a>
  </p>

  <p>
    <a href="https://github.com/LyraZeta/rulefall/actions/workflows/ci.yml"><img src="https://github.com/LyraZeta/rulefall/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/LyraZeta/rulefall?color=6ee7b7" alt="MIT license"></a>
    <a href="https://github.com/LyraZeta/rulefall/stargazers"><img src="https://img.shields.io/github/stars/LyraZeta/rulefall?style=social" alt="GitHub stars"></a>
  </p>
</div>

<img src="public/demo.gif" alt="Rulefall comparing instruction resolution across Codex, Claude Code, Cursor, and GitHub Copilot as the lifecycle moves from startup to discovery to edit">

An `AGENTS.md` at the repository root, a nested `CLAUDE.md`, a Cursor rule with a glob, and a Copilot path instruction may all look like “repo context.” They are not discovered at the same time, scoped the same way, or interpreted by the same agent.

**Rulefall is an interactive lifecycle conformance simulator.** Give it a local folder or ZIP, choose a working directory and target file, then scrub from startup to discovery to edit. Rulefall shows a side-by-side waterfall for Codex, Claude Code, Cursor, and GitHub Copilot, including the source, action, timing, confidence, and reason for every instruction event.

No repository upload. No model call. No agent installation.

## Why Rulefall?

Most instruction tooling answers one of these questions:

- What agent-related files exist in this repository?
- Is this configuration well formed?
- Which `AGENTS.md` files are ancestors of this path?

Rulefall asks a different one:

> **At this point in the agent lifecycle, for this working directory and target file, what reaches each agent—and what does not?**

That makes otherwise silent portability gaps visible before a session surprises you.

## What You Get

- **Lifecycle scrubber** — compare `startup`, `discovery`, and `edit` instead of flattening everything into one inventory.
- **Four-agent waterfall** — inspect Codex, Claude Code, Cursor, and GitHub Copilot on the same workspace and target.
- **Explainable events** — every row is marked `loaded`, `deferred`, `ignored`, `shadowed`, or `truncated`, with a reason and confidence level.
- **Target-aware comparison** — switch the working directory and target file to see scoped guidance move in and out of the effective context.
- **Portability signal** — spot instruction files that only one agent understands; it is a comparison aid, not a quality score.
- **Local inputs** — use the built-in `orbit-payments` fixture, open a folder where the File System Access API is available, or import a ZIP elsewhere.
- **Shareable evidence** — export the visible waterfall as a PNG for an issue, review, or migration discussion. The image can contain the workspace name, repository paths, selected context, and visible instruction excerpts.

## Quick Start

The [online simulator](https://lyrazeta.github.io/rulefall/) is planned for GitHub Pages. Run it locally now:

```bash
git clone https://github.com/LyraZeta/rulefall.git
cd rulefall
corepack enable
pnpm install
pnpm dev
```

Open the printed local URL. The demo is ready immediately; choose **Open folder** or **Import ZIP** to inspect your own repository. All repository reads and simulation happen in your browser.

Imports intentionally skip common dependency/build directories and unsupported file types. Safety limits are 1 MiB per file, 32 MiB of accepted text, 1,500 accepted files, and 10,000 scanned entries; ZIPs are capped at 50 MiB compressed, and suspicious entries above a 200:1 compression ratio are skipped before extraction. A large or unusual repository can therefore produce an incomplete trace. Rulefall keeps the usable subset and displays a visible warning that summarizes skipped content.

Production check:

```bash
pnpm check
```

Rulefall requires Node.js 20.19 or newer in the Node 20 line, or Node.js 22.12 or newer.

## Reading The Waterfall

| Action | Meaning in Rulefall |
| --- | --- |
| `loaded` | The simulated agent recognizes the source and includes it at this phase and target. |
| `deferred` | The source is recognized, but its timing or scope does not yet match. |
| `ignored` | The source belongs to another instruction dialect or is outside modeled behavior. |
| `shadowed` | A higher-precedence source displaces this source in the modeled context. |
| `truncated` | Only part of the source fits the modeled loading or preview budget. |

Every event also carries a confidence label:

- **Exact** — directly modeled from an explicit, stable rule in official documentation.
- **Conditional** — documented behavior depends on product mode, settings, matching, or runtime context.
- **Best effort** — the product does not publish enough detail for an exact model; Rulefall uses a named, inspectable approximation.

The confidence describes **the simulator's semantic claim**, not the quality of your instruction text and not whether a model will obey it.

## Support Matrix

Rulefall v0.1 intentionally supports a small, auditable surface. “Recognized” does not mean every private prompt-assembly detail is known.

| Agent | Recognized repository sources | Lifecycle model | v0.1 semantic fidelity |
| --- | --- | --- | --- |
| OpenAI Codex | `AGENTS.md`, `AGENTS.override.md` | Repository/root guidance at startup; nested guidance as the working scope is discovered | Directory reach is modeled. Override, fallback-name, byte-limit, and launch-location nuances are surfaced conservatively; see [semantics](docs/SEMANTICS.md). |
| Claude Code | Repository `CLAUDE.md` files | Working-directory and ancestor memory at startup; descendant memory when files there are read | Repository-local discovery is modeled. User/managed memory, imports, auto-memory, and product-mode differences are outside v0.1. |
| Cursor | `.cursor/rules/*.mdc`; deprecated root `.cursorrules` | Always-on root rules at startup, nested always-on rules at discovery, and target-dependent rules at edit; legacy root rules are modeled at startup | MDC metadata and target relationships are modeled. Agent-requested/manual attachment and deprecated `.cursorrules` behavior remain conditional. |
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` | Repository instructions on repository discovery; path instructions when a target is known | Repository and path targeting are modeled. Support varies across Copilot surfaces, so target application is conditional. |

See [Semantics and Confidence](docs/SEMANTICS.md) for the normative Rulefall model, exclusions, and source-by-source notes. Provider behavior changes over time; the [official references](docs/REFERENCES.md) are versioned by review date.

## Different From Existing Tools

These projects are useful and adjacent. Rulefall is designed to complement them, not rename their job.

| Project | Primary question | Center of gravity |
| --- | --- | --- |
| [agentoscope](https://github.com/rafaelcg/agentoscope) | “What instruction files are in this repo, and what context might they add?” | Broad multi-format inventory, dashboard, reports, and rule checks |
| [Scopeglass](https://github.com/zackabrah/scopeglass) | “Which ancestor `AGENTS.md` instructions apply to this path?” | Deterministic inheritance, provenance, diagnostics, and CI policy |
| [agnix](https://github.com/agent-sh/agnix) | “Is this agent configuration valid and maintainable?” | Linter, autofixes, LSP, editor integrations, and a large rule catalog |
| **Rulefall** | **“When does each agent load, defer, ignore, shadow, or truncate this instruction?”** | **Cross-agent lifecycle conformance simulation** |

Rulefall is **not** an inventory completeness scanner, prose linter, IDE language server, or an observer of a vendor's hidden system prompt. It does not prove that a model followed an instruction. Use it to reason about documented instruction delivery semantics; pair it with a linter and real agent evaluations when correctness matters.

## Privacy

Rulefall's analysis is local by construction:

- Folder and ZIP contents are read in browser memory.
- Repository content is not uploaded by Rulefall.
- The app has no analytics, telemetry, backend, account, or model API call.
- Imported workspaces are not persisted by the app across reloads.
- Imports enforce file, total-content, entry-count, archive-size, and compression-ratio limits. Partial imports remain usable but carry a visible warning, so a trace is not a completeness guarantee.
- PNG export can contain the workspace name, working directory, target path, repository paths, and visible instruction excerpts; review it before sharing.

The hosting provider still receives ordinary requests for the static application files, and browser extensions or a modified deployment remain outside Rulefall's control. Read the full [privacy model](docs/PRIVACY.md) before inspecting sensitive repositories.

## Roadmap

- **v0.1 — Waterfall:** local workspace import, four-provider comparison, lifecycle phases, reasons, confidence, and PNG export.
- **v0.2 — Semantic fixtures:** versioned provider fixtures, deeper glob/frontmatter evaluation, and shareable JSON traces.
- **v0.3 — Conformance lab:** recorded real-agent observations, documented-vs-observed diffs, and regression packs.
- **Later:** CLI/CI mode, more agents, custom provider profiles, and privacy-preserving team baselines.

The roadmap is directional, not a promise. See [ROADMAP.md](docs/ROADMAP.md) and open a [semantic gap report](https://github.com/LyraZeta/rulefall/issues/new?template=semantic-gap.yml) when the model disagrees with current official behavior.

## FAQ

<details>
<summary><strong>Does Rulefall show the exact prompt sent to a model?</strong></summary>

No. Vendor prompt assembly is partly private and can vary by product surface, version, settings, and session. Rulefall simulates documented repository-instruction behavior and labels uncertainty.
</details>

<details>
<summary><strong>Does “loaded” mean the model followed the instruction?</strong></summary>

No. Delivery, attention, and compliance are separate. Rulefall only models the first.
</details>

<details>
<summary><strong>Why does the same file appear differently across agents?</strong></summary>

Each agent recognizes different filenames, scope metadata, precedence rules, and discovery moments. That mismatch is the product's subject, not an error to normalize away.
</details>

<details>
<summary><strong>Can I inspect a private repository?</strong></summary>

Yes, locally. Prefer **Open folder** or **Import ZIP** on a deployment you trust. Rulefall does not need a GitHub token or repository URL.
</details>

<details>
<summary><strong>Why is a result marked conditional or best effort?</strong></summary>

The relevant vendor behavior may depend on a product mode or may not be fully specified. Open the event's “Why” detail and check the linked official source before treating it as a guarantee.
</details>

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Semantics and confidence](docs/SEMANTICS.md)
- [Privacy model](docs/PRIVACY.md)
- [Official references](docs/REFERENCES.md)
- [Roadmap](docs/ROADMAP.md)
- [v0.1.0 release notes](docs/releases/v0.1.0.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Citation

If Rulefall helps a paper, benchmark, or internal methodology, cite the release you used:

```bibtex
@software{rulefall_2026,
  author  = {LyraZeta and Rulefall contributors},
  title   = {Rulefall: a lifecycle conformance simulator for coding-agent instructions},
  year    = {2026},
  url     = {https://github.com/LyraZeta/rulefall},
  version = {0.1.0}
}
```

## Contributing

Provider semantics are a moving target, so evidence is part of the code. Contributions should include a focused fixture or test and link to an official source whenever behavior changes. Start with [CONTRIBUTING.md](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report vulnerabilities through [SECURITY.md](SECURITY.md).

Rulefall is available under the [MIT License](LICENSE).
