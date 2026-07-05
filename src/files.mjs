import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isEncrypted } from "./age.mjs";

export { existsSync };

// ── Package version ──────────────────────────────────────────────────────────

let _pkg = null;
export function packageVersion() {
  if (_pkg) return _pkg;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, "..", "package.json");
    _pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return _pkg;
  } catch {
    return { version: "0.0.0-unknown", name: "age-vault" };
  }
}

// ── File helpers ─────────────────────────────────────────────────────────────

export const ENC_EXT = ".age";

export function isEncryptedFile(path) {
  return path.endsWith(ENC_EXT);
}

export function plaintextPath(path) {
  return path.endsWith(ENC_EXT) ? path.slice(0, -ENC_EXT.length) : path;
}

export function ciphertextPath(path) {
  return path.endsWith(ENC_EXT) ? path : path + ENC_EXT;
}

export function readFileBytes(path) {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  return readFileSync(path);
}

export function readPlaintext(path) {
  return readFileSync(path, "utf-8");
}

export function writeFileBytes(path, data) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, data);
}

export function writeFileText(path, text) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, text, "utf-8");
}

export function removeFile(path) {
  if (existsSync(path)) unlinkSync(path);
}

export function fileSize(path) {
  if (!existsSync(path)) return 0;
  return statSync(path).size;
}

// ── Vault scanning ────────────────────────────────────────────────────────────

/**
 * Walk a directory tree and return all files (not dirs).
 * @param {string} dir
 * @returns {string[]} absolute paths
 */
export function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    // Skip hidden directories and common noise
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      results.push(...walkFiles(full));
    } else {
      if (entry.name.startsWith(".DS_Store")) continue;
      results.push(full);
    }
  }
  return results;
}

/**
 * Scan a directory and classify files as encrypted or plaintext.
 * @param {string} dir
 * @returns {{encrypted: string[], plaintext: string[]}}
 */
export function scanVault(dir) {
  const files = walkFiles(dir);
  const encrypted = [];
  const plaintext = [];
  for (const file of files) {
    if (isEncryptedFile(file)) {
      encrypted.push(file);
    } else {
      // Check file content for age header (binary or armored)
      try {
        const head = readFileSync(file, { encoding: null, flag: "r" });
        if (isEncrypted(head)) {
          encrypted.push(file);
        } else {
          plaintext.push(file);
        }
      } catch {
        // Binary or unreadable — treat as plaintext
        plaintext.push(file);
      }
    }
  }
  return { encrypted, plaintext };
}

// ── Path helpers ─────────────────────────────────────────────────────────────

export function resolvePath(input) {
  return resolve(process.cwd(), input);
}

export function relativePath(path) {
  return relative(process.cwd(), path) || path;
}