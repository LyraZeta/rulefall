# Privacy Model

Rulefall is designed so repository analysis can happen without sending repository content to a server.

Last reviewed: **August 13, 2026**.

## Data Flow

| Input or action | Where data goes | Persistence |
| --- | --- | --- |
| Built-in demo | Bundled static application | Exists in the public source and build |
| Open folder | Browser memory after explicit directory permission | Not intentionally persisted by Rulefall |
| Import ZIP | Browser memory after explicit file selection | Not intentionally persisted by Rulefall |
| Change working directory/target/phase | In-memory application state | Lost on reload |
| Export PNG | A download generated in the browser | Saved only where the user chooses |
| Load the hosted app | Static hosting provider receives ordinary HTTP metadata | Controlled by the hosting provider's logs/policy |

The stock Rulefall application has no backend, analytics, telemetry, advertising, account, cookie, model API call, or repository upload endpoint.

## What Rulefall Reads

For a selected folder or ZIP, Rulefall considers text-like files while skipping common dependency and build directories and unsupported extensions. Imports accept at most 1 MiB per file, 32 MiB of text in total, 1,500 files, and 10,000 scanned entries. ZIP files are limited to 50 MiB compressed; entries with unknown or invalid size metadata, overlong or unsafe paths, or a compression ratio above 200:1 are skipped before extraction. Imported content is used to build an in-memory workspace and instruction excerpts.

These filters mean an imported workspace is not a completeness guarantee. Large repositories, unsupported file types, oversized files, and content beyond any safety limit may be absent from the trace. Rulefall keeps a usable partial workspace when possible and displays a warning that summarizes skipped categories and counts; it does not expose every skipped path.

Permission to a folder is granted through the browser. Rulefall cannot access an arbitrary local path without the browser-mediated user action. Browser support differs; ZIP import is the fallback.

## What Can Leave Your Machine

In the unmodified project, repository content leaves the page only when you deliberately export and share an image. The exported PNG captures the rendered report and can include the workspace name, selected working directory and target path, repository paths, and visible instruction excerpts. Inspect it before posting publicly.

Static assets, fonts bundled by the application, and application code should be served from the deployment itself. The GitHub README contains remote badges, but those are not part of the simulator runtime.

## Limits Of The Guarantee

Local-only behavior is a property of the reviewed source and deployment, not of every fork or environment. These can violate it:

- a modified or compromised deployment;
- a malicious browser extension;
- injected scripts, developer tools, or local malware;
- a future dependency vulnerability;
- manually sharing an exported image or screen recording;
- hosting-provider request logs, which can contain IP address and user-agent metadata but should not contain imported repository files.

For highly sensitive material, audit the source, install dependencies from the lockfile, run Rulefall locally, disconnect networking after the app loads, and avoid export. Rulefall is not a security boundary for an actively hostile repository or workstation.

Report an unexpected data flow privately through [SECURITY.md](../SECURITY.md).
