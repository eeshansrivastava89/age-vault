import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ENC_EXT,
  isEncryptedFile,
  plaintextPath,
  ciphertextPath,
  scanVault,
  walkFiles,
} from "../src/files.mjs";

let tmpDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "age-vault-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("path helpers", () => {
  it("isEncryptedFile detects .age extension", () => {
    assert.equal(isEncryptedFile("note.md.age"), true);
    assert.equal(isEncryptedFile("note.md"), false);
  });

  it("plaintextPath strips .age", () => {
    assert.equal(plaintextPath("note.md.age"), "note.md");
    assert.equal(plaintextPath("note.md"), "note.md");
  });

  it("ciphertextPath appends .age", () => {
    assert.equal(ciphertextPath("note.md"), "note.md.age");
    assert.equal(ciphertextPath("note.md.age"), "note.md.age");
  });
});

describe("walkFiles", () => {
  it("walks nested directories and returns all files", () => {
    mkdirSync(join(tmpDir, "sub"));
    mkdirSync(join(tmpDir, ".hidden"));
    mkdirSync(join(tmpDir, "node_modules"));
    writeFileSync(join(tmpDir, "a.txt"), "a");
    writeFileSync(join(tmpDir, "sub", "b.txt"), "b");
    writeFileSync(join(tmpDir, ".hidden", "c.txt"), "c");
    writeFileSync(join(tmpDir, "node_modules", "d.txt"), "d");
    writeFileSync(join(tmpDir, ".DS_Store"), "junk");

    const files = walkFiles(tmpDir);
    const names = files.map((f) => f.split("/").pop()).sort();
    assert.deepEqual(names, ["a.txt", "b.txt"]);
  });
});

describe("scanVault", () => {
  it("classifies files by .age extension", () => {
    writeFileSync(join(tmpDir, "plain.md"), "content");
    writeFileSync(join(tmpDir, "secret.md.age"), "ciphertext");
    const { encrypted, plaintext } = scanVault(tmpDir);
    assert.equal(encrypted.length, 1);
    assert.equal(plaintext.length, 1);
    assert.ok(encrypted[0].endsWith("secret.md.age"));
    assert.ok(plaintext[0].endsWith("plain.md"));
  });

  it("detects age-encrypted files without .age extension via content", async () => {
    const { encrypt } = await import("../src/age.mjs");
    const ct = await encrypt("secret", "p");
    writeFileSync(join(tmpDir, "note.txt"), Buffer.from(ct));
    const { encrypted, plaintext } = scanVault(tmpDir);
    assert.equal(encrypted.length, 1);
    assert.equal(plaintext.length, 0);
  });
});