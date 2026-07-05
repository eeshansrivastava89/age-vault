import { pc, promptPassword, parseOptions, formatBytes } from "../ui.mjs";
import { decrypt, decryptArmored, isEncrypted } from "../age.mjs";
import {
  resolvePath,
  readFileBytes,
  writeFileBytes,
  removeFile,
  existsSync,
  fileSize,
  relativePath,
} from "../files.mjs";

/**
 * Decrypt a .age file with a passphrase.
 * Writes the plaintext file, optionally removes the ciphertext.
 *
 * Usage: age-vault -d <file> [--keep] [--force]
 */
export async function decryptCommand(argv) {
  const { positional, options } = parseOptions(argv);
  if (positional.length === 0) throw new Error("No file specified. Usage: age-vault -d <file>");
  if (positional.length > 1) throw new Error("Decrypt takes one file at a time. Usage: age-vault -d <file>");

  const input = resolvePath(positional[0]);
  if (!existsSync(input)) throw new Error(`File not found: ${input}`);

  const ct = readFileBytes(input);
  const armored = isTextArmored(ct);
  if (!isEncrypted(ct)) {
    throw new Error(`File does not appear to be age-encrypted: ${input}`);
  }

  const keep = Boolean(options.keep);
  const force = Boolean(options.force);

  const passphrase = await promptPassword("Enter passphrase");
  let plaintext;
  try {
    plaintext = armored
      ? await decryptArmored(ct.toString("utf-8"), passphrase)
      : await decrypt(ct, passphrase);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Decryption failed — wrong passphrase or corrupt file: ${msg}`, { cause: err });
  }

  const outPath = resolvePlaintextPath(input);
  if (existsSync(outPath) && !force) {
    throw new Error(`Output file exists: ${relativePath(outPath)}. Use --force to overwrite.`);
  }
  writeFileBytes(outPath, Buffer.from(plaintext, "utf-8"));

  const inSize = fileSize(input);
  const outSize = fileSize(outPath);

  console.log(pc.green("✓") + ` Decrypted ${relativePath(input)}`);
  console.log(pc.dim(`  ${formatBytes(inSize)} → ${formatBytes(outSize)}`));
  console.log(pc.dim(`  Output: ${relativePath(outPath)}`));

  if (keep) {
    console.log(pc.yellow("  Kept ciphertext (--keep)"));
  } else {
    removeFile(input);
    console.log(pc.green("✓") + ` Removed ciphertext ${relativePath(input)}`);
  }

  console.log(pc.dim(`\n  Re-encrypt with: age-vault -e ${relativePath(outPath)}`));
}

function isTextArmored(buf) {
  if (!Buffer.isBuffer(buf)) return false;
  const head = buf.subarray(0, 40).toString("utf-8");
  return head.startsWith("-----BEGIN AGE ENCRYPTED FILE-----");
}

function resolvePlaintextPath(input) {
  if (input.endsWith(".age")) return input.slice(0, -4);
  return input + ".decrypted";
}