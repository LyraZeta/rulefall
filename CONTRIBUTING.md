# Contributing to Rulefall

Thank you for helping make coding-agent instruction behavior easier to inspect. Rulefall welcomes bug fixes, provider-semantic corrections, fixtures, accessibility improvements, documentation, and carefully scoped features.

## Before You Start

- Search existing issues and pull requests before opening a duplicate.
- Use a [semantic gap report](https://github.com/LyraZeta/rulefall/issues/new?template=semantic-gap.yml) when Rulefall disagrees with current provider behavior.
- Use a [feature request](https://github.com/LyraZeta/rulefall/issues/new?template=feature.yml) for new product behavior.
- Keep security reports private according to [SECURITY.md](SECURITY.md).
- For a large change, open an issue first so the semantic and UI contract can be agreed before implementation.

## Development Setup

Requirements:

- Node.js 22.13 or newer
- Corepack and the pnpm version declared in `package.json`

```bash
corepack enable
pnpm install
pnpm dev
```

Before opening a pull request:

```bash
pnpm lint
pnpm test
pnpm build
```

`pnpm check` runs the same three gates in sequence.

## Semantic Changes Need Evidence

The hard part of Rulefall is not finding filenames; it is representing changing vendor behavior without overstating certainty. A pull request that changes provider semantics should include:

1. A link to current official documentation, including the relevant heading or quoted behavior in the pull request description.
2. A focused fixture or test that fails before the change and passes after it.
3. The appropriate confidence: `exact`, `conditional`, or `best-effort`.
4. A documentation update when support boundaries or user-visible language changes.
5. The date the source was reviewed when editing `docs/REFERENCES.md`.

Do not infer hidden prompt assembly from a single model response. Reproducible product observations are welcome, but label them as observed behavior and include the product surface, version/build if visible, settings, operating system, date, and minimal reproduction.

## Code Style

- Follow the existing TypeScript, React, and CSS patterns.
- Keep the simulation core deterministic and independent from view components.
- Prefer small, explicit provider rules over a shared abstraction that erases real differences.
- Avoid adding network requests, telemetry, or repository persistence without prior discussion.
- Preserve local-only analysis and accessible keyboard behavior.
- Add comments only where the reason is not clear from the code.

## Pull Requests

Keep each pull request focused. Fill in the pull request template, describe user-visible behavior, and call out semantic uncertainty. UI changes should include screenshots or a short recording when useful, but never include private repository content.

Maintainers may ask to split unrelated work, add evidence, or downgrade a certainty claim before merging. Reviews follow the [Code of Conduct](CODE_OF_CONDUCT.md).

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
