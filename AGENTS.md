# Agent Instructions for age-vault

## Release Workflow

- **Never run `npm publish` locally.** Pushing a `v*` tag triggers `.github/workflows/ci.yml`, which runs tests and publishes to npm with provenance. Publishing manually causes CI to fail with npm 403.
- Version bumps: commit first, then push the tag. Let CI publish.

## How to Work in This Repo

- **Root cause first.** Understand the problem before writing code. Read relevant source, reproduce if possible, then fix.
- **DRY and minimal.** Avoid duplication. Prefer deleting code to adding code. If a helper already exists, use it.
- **Reuse existing solutions.** Prefer standard library, established npm packages, and patterns already in the codebase over custom implementations.
- **Single path over competing paths.** Keep one clear way to do each behavior; remove duplicate/legacy pathways instead of maintaining parallel implementations.
- **No hidden fallbacks.** Do not silently substitute stale caches, alternate mechanisms, or best-effort behavior that changes outcomes without telling the user; make fallback behavior explicit or remove it.
- **Usability over cleverness.** Make workflows simple and friendly for non-technical users. Clear errors, sensible defaults, minimal steps.
- **Explain failures, don't just report them.** When something fails, diagnose the cause and surface a specific, actionable reason.
- **Terminal output should fit.** Long messages must wrap so cards/tables stay aligned and readable.
- **Commit workflow.** Propose a focused conventional-commit message and ask for approval before committing. Keep commits small and logical.
- **Document consolidation.** Completed plans go to `internal-docs/archive/`. Living runbooks go to `internal-docs/reference/`. Active strategy stays in `internal-docs/` root. Keep the README simple; detailed internals live in `internal-docs/`.
- **Protect user data.** Never overwrite, move, delete, or truncate plaintext files without explicit instruction. The encrypt command removes plaintext by default (--keep to preserve); the decrypt command removes ciphertext by default (--keep to preserve). These are intentional design choices, not accidents.
- **Codebase is the source of truth.** Verify assumptions against current files and tests, not memory or old docs.
- **Distinguish repo state from user environment.** The local repo version may differ from what the user has installed globally. Check installed state when relevant (`npm list -g`, `which age-vault`, etc.).
- **Test and lint before committing.** Run `npm test` and `npm run lint`. Keep the change focused.

## Architecture Notes

- **Crypto**: `age-encryption` (npm) — TypeScript impl of the age format by FiloSottile. Pure JS, no native binaries, no external `age` CLI required. Files are standard age format and interop with the Go `age` CLI, `rage`, `passage`, SOPS, etc.
- **Passphrase-only**: This tool uses passphrase-based encryption (Argon2id/scrypt KDF via age). Key-based encryption is out of scope — use `age` or `passage` directly for that.
- **Stateless**: No config files, no key stores, no profiles. Each invocation is independent. Password entered per-command.
- **Format**: Encrypted files use `.age` extension. Binary age format by default; `--armor` for PEM-style ASCII output.