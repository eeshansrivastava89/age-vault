import { Encrypter, Decrypter, armor } from "age-encryption";

// age format header (binary): "age-encryption.org/v1"
const AGE_HEADER = Buffer.from("age-encryption.org/v1", "utf-8");

// ASCII-armored header line
const ARMOR_HEADER = "-----BEGIN AGE ENCRYPTED FILE-----";

/**
 * Detect whether a buffer/string is age-encrypted (binary or armored).
 * @param {Buffer | string} data
 * @returns {boolean}
 */
export function isEncrypted(data) {
  if (!data) return false;
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  // Binary age format: starts with raw bytes "age-encryption.org/v1"
  if (buf.length >= AGE_HEADER.length && buf.subarray(0, AGE_HEADER.length).equals(AGE_HEADER)) return true;
  // ASCII-armored format: starts with "-----BEGIN AGE ENCRYPTED FILE-----"
  const head = buf.subarray(0, ARMOR_HEADER.length).toString("utf-8");
  return head === ARMOR_HEADER;
}

/**
 * Encrypt content with a passphrase (binary age format).
 * @param {Buffer | string} plaintext
 * @param {string} passphrase
 * @returns {Promise<Uint8Array>} ciphertext
 */
export async function encrypt(plaintext, passphrase) {
  const e = new Encrypter();
  e.setPassphrase(passphrase);
  const input = typeof plaintext === "string" ? Buffer.from(plaintext, "utf-8") : plaintext;
  return e.encrypt(input);
}

/**
 * Decrypt age ciphertext with a passphrase.
 * @param {Buffer | Uint8Array} ciphertext
 * @param {string} passphrase
 * @returns {Promise<string>} plaintext (utf-8)
 */
export async function decrypt(ciphertext, passphrase) {
  const d = new Decrypter();
  d.addPassphrase(passphrase);
  return d.decrypt(ciphertext, "uint8array");
}

/**
 * Encrypt to ASCII-armored text format.
 * @param {Buffer | string} plaintext
 * @param {string} passphrase
 * @returns {Promise<string>} armored ciphertext
 */
export async function encryptArmored(plaintext, passphrase) {
  const ct = await encrypt(plaintext, passphrase);
  return armor.encode(ct);
}

/**
 * Decrypt ASCII-armored ciphertext.
 * @param {string} armored
 * @param {string} passphrase
 * @returns {Promise<string>} plaintext
 */
export async function decryptArmored(armoredText, passphrase) {
  const ct = armor.decode(armoredText);
  return decrypt(ct, passphrase);
}