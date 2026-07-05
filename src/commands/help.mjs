import { pc, renderCard, renderRows } from "../ui.mjs";
import { packageVersion } from "../files.mjs";

export function printHelp() {
  console.log(renderCard("age-vault", renderRows([
    ["What it is", "Passphrase-based file encryption built on age"],
    ["Encrypt", pc.bold("age-vault -e <file>")],
    ["Decrypt", pc.bold("age-vault -d <file>")],
    ["List", "age-vault -l [dir]"],
    ["Status", pc.bold("age-vault -ls [dir]")],
    ["Version", "age-vault --version"],
    ["Help", "age-vault --help"],
  ]), { formatBorder: pc.cyan }));
  console.log();
  console.log(renderCard("Flags", renderRows([
    ["--armor", "Encrypt to ASCII-armored text (PEM) format"],
    ["--keep", "Keep the source file (skips delete confirmation)"],
    ["--force", "Overwrite existing output file on decrypt"],
  ]), { formatBorder: pc.magenta }));
  console.log();
  console.log(pc.dim("By default, the source file is deleted after encrypt/decrypt."));
  console.log(pc.dim("You'll be asked to confirm before deletion. Use --keep to skip both."));
  console.log();
  console.log(pc.dim("Files use the standard age format. They can be decrypted with age-vault,"));
  console.log(pc.dim("the age CLI (https://github.com/FiloSottile/age), or any age-compatible tool."));
}

export function printVersion() {
  const { version, name } = packageVersion();
  console.log(`${name} v${version}`);
}