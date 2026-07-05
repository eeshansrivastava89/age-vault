# age-vault

Passphrase-based file encryption CLI built on [age](https://age-encryption.org).

Encrypt, decrypt, and inspect sensitive files with a single password. No keys to manage, no agents to run, no config files to maintain. Files use the standard age format — interoperable with the `age` CLI, `rage`, `passage`, and SOPS.

## Why

Most encryption tools assume you want key management. Sometimes you just want to password-protect a file — notes, tax docs, credentials, configs — and have it be unreadable to anyone without the password, including sync providers and AI tools that scan your filesystem.

`age-vault` is a friendly wrapper around the age encryption format for that case. It uses the TypeScript age implementation ([typage](https://github.com/FiloSottile/typage)) so no external binary is required.

## Install

```bash
npm install -g age-vault
```

Or via curl installer (installs Node if needed):

```bash
curl -fsSL https://raw.githubusercontent.com/eeshansrivastava89/age-vault/main/install.sh | bash
```

## Usage

```bash
# Encrypt a file (prompts for passphrase twice, removes plaintext)
age-vault -e notes.md

# Decrypt a file (prompts for passphrase, removes ciphertext)
age-vault -d notes.md.age

# List encrypted files under the current directory
age-vault -l

# Show vault status — counts, tree, unencrypted warnings
age-vault -l --status
age-vault -l --status path/to/vault
```

### Flags

| Flag | Description |
|------|-------------|
| `--armor` | Encrypt to ASCII-armored PEM format (emailable text) |
| `--keep` | Don't delete the source file after encrypt/decrypt |
| `--force` | Overwrite existing output file on decrypt |

### Example

```bash
$ echo "secret" > tax-2026.md
$ age-vault -e tax-2026.md
Enter passphrase: ********
Confirm passphrase: ********
✓ Encrypted tax-2026.md
  7 B → 197 B
  Output: tax-2026.md.age
✓ Removed plaintext tax-2026.md

$ age-vault -l --status
  ╭ Vault Status ──────────────────────────────╮
  │ Directory      .                            │
  │ Total files    1                            │
  │ Encrypted      1  (100%)                    │
  │ Plaintext      0  (0%)                      │
  ╰─────────────────────────────────────────────╯

$ age-vault -d tax-2026.md.age
Enter passphrase: ********
✓ Decrypted tax-2026.md.age
✓ Removed ciphertext tax-2026.md.age
```

## How it works

- **Encryption**: Argon2id KDF derives a key from your passphrase, then age encrypts the file with ChaCha20-Poly1305. This is the same crypto the `age` CLI uses.
- **Format**: Standard age v1 format. Files encrypted with `age-vault` can be decrypted with `age -d`, and vice versa.
- **At rest**: Encrypted files are pure ciphertext. Sync providers (iCloud, Dropbox), AI tools, and anyone scanning your filesystem sees gibberish.
- **In transit to LLMs**: Encryption protects files *at rest*. If you decrypt and paste content into a chat, it's obviously exposed at that point.

## Development

```bash
git clone https://github.com/eeshansrivastava89/age-vault.git
cd age-vault
npm install
npm test
node bin/age-vault.mjs --help
```

## License

MIT — Eeshan Srivastava (https://eeshans.com)