# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-06-25

### Added
- **Introduced request options helper function** — centralized HTTP configuration for the Mailjet API.
  - Added the `getRequestOptionsMCPForAuth()` helper function to encapsulate the `hostname` and `headers` definitions (including `Authorization`, `Content-Type`, and `User-Agent`), promoting reuse across different request methods.

### Changed

- **Refactored HTTP request configuration** — streamlined how request options are applied in the main client.
  
## [1.0.2] - 2026-06-24

### Added

- **Startup API credential validation** — introduced pre-flight configuration safety checks to the initialization workflow.
  - Added the `validateMailjetKeys()` helper function to verify credentials against `https://api.mailjet.com/v3/REST/user` via a secure HTTP request.
  - Integrated a validation guard in the `main()` server loop to halt startup and throw an error if a valid `MAILJET_API_KEY` is not supplied in the environment.

### Changed

- **Package scoping and version bump** — transitioned the package configuration in `package.json` to a scoped release.
  - Renamed the package from the unscoped `mailjet-mcp-server` to the scoped `@mailjet/mailjet-mcp-server`.
  - Added `publishConfig` (setting access to public) and the explicit GitHub `repository` metadata block.
- **Enabled global NPX CLI support** — configured the package to allow seamless execution and desktop app integration.
  - Added the `bin` routing mapping (`"mailjet-mcp-server": "src/mailjet-mcp.js"`) to `package.json`.
  - Restored the `#!/usr/bin/env node` shebang to the top of `src/mailjet-mcp.js`.
  - Made `src/mailjet-mcp.js` an executable node script.
- **Updated dependencies** — update minor version of dependencies when available.
  - Updated `@types/node` from `22.19.21` to `22.20.0`.
- **Expanded Quick Start & distribution docs** — updated the `README.md` to assist with remote execution.
  - Added dedicated instructions for executing the server directly using `npx mailjet-mcp-server`.
  - Included a configuration guide for linking the server to AI desktop applications using the `mcpServers` setting.
  - Appended a new **Publishing** documentation section details of the official Mailjet NPM registry.

---

## [1.0.1] - 2026-06-11

### Changed

- **Zod v4 migration** — upgraded from Zod 3 to Zod 4.
  - Replaced `zod/v3` compatibility shim imports with the standard `zod` entry point.
  - Enabled the v4 locale system via `z.config(z.locales.en())`.
  - Fixed `z.record()` call to use an explicit string key type (`z.string()`) as required by v4.
  - Added single-element guard for `z.union()` on `oneOf`/`anyOf` schemas to comply with v4's minimum two-member requirement.
- **Bumped minimum Node.js requirement** from `>=20.10.0` to `>=20.11.1`
- **Updated all runtime dependencies**:
  - `@modelcontextprotocol/sdk` `^1.12.0` → `1.29.0`
  - `js-yaml` `^4.1.0` → `4.2.0`
  - `zod` `^3.25.30` → `4.4.3`
- **Updated dev dependencies**:
  - `@types/node` `^20.17.50` → `^22.18`
- **Updated CI action dependencies**:
  - `actions/checkout` → `v6`
  - `actions/setup-node` → `v6`
  - Node.js CI version pinned to `20.11.1` to match the minimum supported version
- **Added `packageManager` field** to `package.json` pinning pnpm to `10.33.4`

### Fixed

- Test assertions updated from Zod v3's `._def.typeName` (e.g. `"ZodString"`) to Zod v4's `._def.type` (e.g. `"string"`).

### Security

- Pinned unofficial GitHub Actions to exact versions to prevent supply-chain risk:
  - `pnpm/action-setup` → pinned SHA `0e279bb...` (v6.0.8)
  - `pnpm` version locked to `10.33.4`

[1.0.3]: https://github.com/mailgun/mailjet-mcp-server/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/mailgun/mailjet-mcp-server/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/mailgun/mailjet-mcp-server/compare/v1.0.0...v1.0.1
