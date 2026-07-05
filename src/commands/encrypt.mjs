import { pc, promptPassword, parseOptions, formatBytes } from "../ui.mjs";
import { encrypt, encryptArmored } from "../age.mjs";
import {
  resolvePath,
  readFileBytes,
  writeFileBytes,
  removeFile,
  existsSync,
  ciphertextPath,
  fileSize,
  relativePath,
} from "../files.mjs";

/**
 * Encrypt a file with a passphrase.
 * Writes <file>.age, optionally removes the plaintext.
 *
 * Usage: age-vault -e <file> [--armor] [--keep]
 */
export async function encryptCommand(argv) {
  const { positional, options } = parseOptions(argv);
  if (positional.length === 0) throw new Error("No file specified. Usage: age-vault -e <file>");
  if (positional.length > 1) throw new Error("Encrypt takes one file at a time. Usage: age-vault -e <file>");

  const input = resolvePath(positional[0]);
  if (!existsSync(input)) throw new Error(`File not found: ${input}`);
  if (input.endsWith(".age")) throw new Error("File already has .age extension — refusing to encrypt.");

  const armor = Boolean(options.armor);
  const keep = Boolean(options.keep);

  const passphrase = await promptPassword("Enter passphrase", { confirm: true });

  const plaintext = readFileBytes(input);
  const ct = armor ? await encryptArmored(plaintext, passphrase) : await encrypt(plaintext, passphrase);
  const outPath = ciphertextPath(input);
  writeFileBytes(outPath, Buffer.from(ct));

  const inSize = fileSize(input);
  const outSize = fileSize(outPath);

  console.log(pc.green("✓") + ` Encrypted ${relativePath(input)}`);
  console.log(pc.dim(`  ${formatBytes(inSize)} → ${formatBytes(outSize)}`));
  console.log(pc.dim(`  Output: ${relativePath(outPath)}`));

  if (keep) {
    console.log(pc.yellow("  Kept plaintext (--keep)"));
  } else {
    removeFile(input);
    console.log(pc.green("✓") + ` Removed plaintext ${relativePath(input)}`);
  }

  if (!keep) {
    console.log(pc.dim(`\n  Decrypt with: age-vault -d ${relativePath(outPath)}`));
  }
}