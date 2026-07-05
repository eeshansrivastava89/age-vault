<div align="center">

# age-vault

**Passphrase-based file encryption CLI built on age.**

[![npm](https://img.shields.io/npm/v/age-vault)](https://www.npmjs.com/package/age-vault)
[![license](https://img.shields.io/github/license/eeshansrivastava89/age-vault)](LICENSE)
[![node](https://img.shields.io/node/v/age-vault)](package.json)
[![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-blue)]()

```bash
npx age-vault -e secrets.txt
```

> **Requirements:** [Node.js 20+](https://nodejs.org/). Files use the standard age format — interoperable with the `age` CLI, `rage`, `passage`, and SOPS.

</div>

<br>

## What is it?

age-vault is a command-line tool for encrypting files with a passphrase. No keys to manage, no agents to run, no config files to maintain. You pick a password, it encrypts the file, and the original is gone.

Most encryption tools assume you want key management. Sometimes you just want to password-protect a file — notes, tax docs, credentials, configs — and have it be unreadable to anyone without the password, including sync providers and AI tools that scan your filesystem.

age-vault is a friendly wrapper for that case. It uses the TypeScript age implementation ([typage](https://github.com/FiloSottile/typage)) so no external binary is required.

## Install

```bash
# npm
npm install -g age-vault

# curl installer (installs Node if needed)
curl -fsSL https://raw.githubusercontent.com/eeshansrivastava89/age-vault/main/install.sh | bash
```

## Usage

```bash
# Encrypt a file (prompts for passphrase, removes plaintext)
age-vault -e notes.md

# Decrypt a file (prompts for passphrase, removes ciphertext)
age-vault -d notes.md.age

# List encrypted files under the current directory
age-vault -l

# Show vault status — counts, tree, unencrypted warnings
age-vault -ls
age-vault -ls path/to/vault
```

### Flags

| Flag | Description |
|------|-------------|
| `--armor` | Encrypt to ASCII-armored PEM format (emailable text) |
| `--keep` | Keep the source file (skips delete confirmation) |
| `--force` | Overwrite existing output file on decrypt |

### Example

```bash
$ echo "secret" > tax-2026.md
$ age-vault -e tax-2026.md

─ Remember your passphrase ────────────────────────────────────────
 If you lose it, this file cannot be recovered — there is no reset.
───────────────────────────────────────────────────────────────────

✔ Enter passphrase ********
✔ Confirm passphrase ********
✓ Encrypted tax-2026.md
  7 B → 197 B
  Output: tax-2026.md.age
Delete the original tax-2026.md? [Y/n]
✓ Removed plaintext tax-2026.md

$ age-vault -ls

─ Vault Status ───────────────────
 Directory       .
 Total files     1
 Encrypted       1  (100%)
 Plaintext       0  (0%)
 Encrypted size  197 B
 Plaintext size  0 B
───────────────────────────────────

File tree

./
└── 🔒 tax-2026.md.age 197 B

$ age-vault -d tax-2026.md.age
✔ Enter passphrase ********
✓ Decrypted tax-2026.md.age
Delete the ciphertext tax-2026.md.age? [Y/n]
✓ Removed ciphertext tax-2026.md.age
```

## How it works

- **Crypto**: Argon2id KDF derives a key from your passphrase, then age encrypts the file with ChaCha20-Poly1305. Same crypto as the `age` CLI.
- **Format**: Standard age v1. Files encrypted with age-vault can be decrypted with `age -d`, and vice versa.
- **At rest**: Encrypted files are pure ciphertext. Sync providers (iCloud, Dropbox), AI tools, and anyone scanning your filesystem sees gibberish.
- **Stateless**: No config files, no key stores, no data directory. Every run is a clean start — you just need your passphrase.

## Need help?

```bash
age-vault --help
```

## Development

```bash
git clone https://github.com/eeshansrivastava89/age-vault.git
cd age-vault
npm install
npm test
node bin/age-vault.mjs --help
```

## License

MIT — [Eeshan Srivastava](https://eeshans.com)