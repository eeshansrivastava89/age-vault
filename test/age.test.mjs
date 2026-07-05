import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt, encryptArmored, decryptArmored, isEncrypted } from "../src/age.mjs";

describe("age crypto round-trip", () => {
  it("encrypts and decrypts a string with a passphrase", async () => {
    const plaintext = "hello age";
    const ct = await encrypt(plaintext, "test-pass");
    assert.ok(Buffer.from(ct).length > 0, "ciphertext should not be empty");
    assert.ok(isEncrypted(Buffer.from(ct)), "ciphertext should be detected as age-encrypted");
    const pt = await decrypt(ct, "test-pass");
    assert.equal(Buffer.from(pt).toString("utf-8"), "hello age");
  });

  it("encrypts and decrypts binary data", async () => {
    const data = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
    const ct = await encrypt(data, "bin-pass");
    const pt = await decrypt(ct, "bin-pass");
    assert.deepEqual(Buffer.from(pt), data, "binary round-trip should preserve all bytes");
  });

  it("fails with wrong passphrase", async () => {
    const ct = await encrypt("secret", "correct");
    await assert.rejects(
      () => decrypt(ct, "wrong"),
      /identity matched|recipient|decrypt/i,
    );
  });

  it("round-trips armored format", async () => {
    const plaintext = "armored content with unicode: 你好 🦈";
    const armored = await encryptArmored(plaintext, "pass");
    assert.equal(typeof armored, "string");
    assert.ok(armored.startsWith("-----BEGIN AGE ENCRYPTED FILE-----"));
    const pt = await decryptArmored(armored, "pass");
    assert.equal(Buffer.from(pt).toString("utf-8"), plaintext);
  });
});

describe("isEncrypted detection", () => {
  it("detects binary age header", async () => {
    const ct = await encrypt("x", "p");
    assert.equal(isEncrypted(Buffer.from(ct)), true);
  });

  it("detects armored age header", async () => {
    const armored = await encryptArmored("x", "p");
    assert.equal(isEncrypted(armored), true);
    // Buffer input (what readFileBytes returns) — this was the bug
    assert.equal(isEncrypted(Buffer.from(armored, "utf-8")), true);
  });

  it("returns false for plaintext", () => {
    assert.equal(isEncrypted(Buffer.from("hello world")), false);
    assert.equal(isEncrypted("just some text"), false);
  });

  it("returns false for empty input", () => {
    assert.equal(isEncrypted(Buffer.alloc(0)), false);
    assert.equal(isEncrypted(""), false);
    assert.equal(isEncrypted(null), false);
  });
});