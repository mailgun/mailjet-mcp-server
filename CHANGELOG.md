# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-06-11

### Changed

- **Zod v4 migration** — upgraded from Zod 3 to Zod 4.
  - Replaced `zod/v3` compatibility shim imports with the standard `zod` entry point.
  - Enabled the v4 locale system via `z.config(z.locales.en())`.
  - Fixed `z.record()` call to use an explicit string key type (`z.string()`) as required by v4.
  - Added single-element guard for `z.union()` on `oneOf`/`anyOf` schemas to comply with v4's minimum two-member requirement.
- **Updated all runtime dependencies**:
  - `@modelcontextprotocol/sdk` `^1.12.0` → `1.29.0`
  - `js-yaml` `^4.1.0` → `4.2.0`
  - `zod` `^3.25.30` → `4.4.3`
- **Updated dev dependencies**:
  - `@types/node` `^20.17.50` → `^22.18`
- **Updated CI action dependencies**:
  - `actions/checkout` → `v6`
  - `actions/setup-node` → `v6`

### Fixed

- Test assertions updated from Zod v3's `._def.typeName` (e.g. `"ZodString"`) to Zod v4's `._def.type` (e.g. `"string"`).

### Security

- Pinned unofficial GitHub Actions to exact versions to prevent supply-chain risk:
  - `pnpm/action-setup` → pinned SHA `0e279bb...` (v6.0.8)
  - `pnpm` version locked to `10.33.4`

[1.0.1]: https://github.com/mailgun/mailjet-mcp-server/compare/v1.0.0...v1.0.1
