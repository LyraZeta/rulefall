# Security Policy

## Supported Versions

Rulefall is pre-1.0. Security fixes are applied to the latest release and the `main` branch.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| Older or unreleased forks | No |

## Reporting A Vulnerability

Please do not open a public issue for a suspected vulnerability.

Use [GitHub private vulnerability reporting](https://github.com/LyraZeta/rulefall/security/advisories/new) and include:

- the affected version, commit, or deployment;
- a minimal reproduction or proof of concept;
- impact and the conditions required to trigger it;
- whether repository content can leave the browser or appear in an export;
- any suggested mitigation;
- how you would like to be credited.

You should receive an acknowledgement within 5 business days and a status update within 10 business days. These are response targets, not guarantees. We will coordinate disclosure after a fix or mitigation is available and will credit reporters who request it.

## Security Model

Rulefall is a static browser application. Its intended deployment has no backend, account system, telemetry, model calls, or repository upload. Folder and ZIP inputs are processed in browser memory. The main security boundaries are therefore:

- safely treating repository content as untrusted text;
- avoiding execution or active rendering of imported content;
- preventing accidental network transmission or persistence;
- bounding file count and size to reduce resource exhaustion;
- escaping repository-controlled text in UI and exported artifacts;
- keeping third-party build dependencies and GitHub Actions current.

Rulefall is not a sandbox for hostile repositories. A malicious browser extension, compromised deployment, modified fork, vulnerable dependency, or local operating-system compromise can violate these assumptions. Review [docs/PRIVACY.md](docs/PRIVACY.md) for the data-flow model.

## Research Guidelines

Good-faith research is welcome. Use test data, avoid privacy violations and service disruption, and stop after demonstrating impact. Do not access data that is not yours. We will not pursue legal action for research that follows these guidelines and gives the project a reasonable opportunity to remediate the issue.
