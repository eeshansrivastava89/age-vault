import { pc, renderCard, renderRows, formatBytes, parseOptions } from "../ui.mjs";
import { resolvePath, relativePath, scanVault } from "../files.mjs";
import { existsSync, statSync } from "node:fs";

/**
 * List encrypted files or show vault status.
 *
 * Usage:
 *   age-vault -l                  → list encrypted files under cwd
 *   age-vault -l <dir>            → list encrypted files under <dir>
 *   age-vault -l --status         → vault status summary (counts, tree)
 *   age-vault -l --status <dir>   → vault status for <dir>
 */
export async function listCommand(argv) {
  const { positional, options } = parseOptions(argv);
  const dir = positional.length > 0 ? resolvePath(positional[0]) : process.cwd();

  if (!existsSync(dir)) throw new Error(`Directory not found: ${dir}`);

  if (options.status) {
    return vaultStatus(dir);
  }

  const { encrypted } = scanVault(dir);
  if (encrypted.length === 0) {
    console.log(pc.dim("No encrypted files found under ") + pc.cyan(relativePath(dir)));
    return;
  }

  console.log(pc.cyan("Encrypted files under ") + pc.bold(relativePath(dir)) + pc.dim(` (${encrypted.length})`));
  console.log();
  for (const file of encrypted) {
    const rel = relativePath(file);
    const size = fileSizeSafe(file);
    console.log(`  ${pc.green("🔒")} ${rel} ${pc.dim(formatBytes(size))}`);
  }
  console.log();
  console.log(pc.dim(`Decrypt with: age-vault -d <file>`));
}

function fileSizeSafe(path) {
  try { return statSync(path).size; } catch { return 0; }
}

function sumSizes(files) {
  return files.reduce((sum, f) => sum + fileSizeSafe(f), 0);
}

/**
 * Show a full vault status: counts, tree, summary card.
 */
async function vaultStatus(dir) {
  const { encrypted, plaintext } = scanVault(dir);
  const total = encrypted.length + plaintext.length;

  if (total === 0) {
    console.log(pc.dim("No files found under ") + pc.cyan(relativePath(dir)));
    return;
  }

  const encPct = total > 0 ? Math.round((encrypted.length / total) * 100) : 0;
  const plainPct = 100 - encPct;

  const card = renderCard(
    "Vault Status",
    renderRows([
      ["Directory", pc.bold(relativePath(dir))],
      ["Total files", String(total)],
      ["Encrypted", `${pc.green(String(encrypted.length))}  (${encPct}%)`],
      ["Plaintext", `${pc.yellow(String(plaintext.length))}  (${plainPct}%)`],
      ["Encrypted size", formatBytes(sumSizes(encrypted))],
      ["Plaintext size", formatBytes(sumSizes(plaintext))],
    ]),
    { formatBorder: pc.cyan },
  );
  console.log();
  console.log(card);

  console.log();
  console.log(pc.cyan("File tree"));
  console.log();
  const tree = buildTree(dir, encrypted, plaintext);
  printTree(tree, "", true);
  console.log();

  if (plaintext.length > 0) {
    console.log(pc.yellow(`! ${plaintext.length} file(s) are not encrypted:`));
    for (const f of plaintext.slice(0, 10)) {
      console.log(`  ${pc.yellow("•")} ${relativePath(f)}`);
    }
    if (plaintext.length > 10) {
      console.log(pc.dim(`  ... and ${plaintext.length - 10} more`));
    }
    console.log();
    console.log(pc.dim(`Encrypt with: age-vault -e <file>`));
  }
}

// ── Minimal tree builder ─────────────────────────────────────────────────────

function buildTree(root, encrypted, plaintext) {
  const encSet = new Set(encrypted.map((f) => f));
  const tree = { name: relativePath(root) || ".", children: new Map(), files: [] };

  const allFiles = [...encrypted, ...plaintext];
  for (const file of allFiles) {
    const rel = file.startsWith(root) ? file.slice(root.length).replace(/^[/\\]/, "") : file;
    const parts = rel.split(/[/\\]/);
    let node = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, children: new Map(), files: [] });
      }
      node = node.children.get(part);
    }
    const fileName = parts[parts.length - 1];
    node.files.push({
      name: fileName,
      encrypted: encSet.has(file),
      size: fileSizeSafe(file),
    });
  }
  return tree;
}

function printTree(node, prefix, isLast) {
  if (node.name !== "." || prefix === "") {
    const branch = prefix === "" ? "" : (isLast ? "└── " : "├── ");
    const dirChar = prefix === "" ? "" : "📁 ";
    console.log(`${prefix}${branch}${dirChar}${pc.bold(node.name)}/`);
  }
  const childPrefix = prefix === "" ? "" : (isLast ? "    " : "│   ");

  const childDirs = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name));
  const allChildren = [...childDirs];
  const sortedFiles = node.files.sort((a, b) => a.name.localeCompare(b.name));
  allChildren.push(...sortedFiles.map((f) => ({ type: "file", ...f })));

  allChildren.forEach((child, i) => {
    const last = i === allChildren.length - 1;
    const branch = last ? "└── " : "├── ";
    if (child.type === "file") {
      const icon = child.encrypted ? pc.green("🔒") : pc.yellow("📄");
      const color = child.encrypted ? pc.green : pc.yellow;
      console.log(`${childPrefix}${branch}${icon} ${color(child.name)} ${pc.dim(formatBytes(child.size))}`);
    } else {
      printTree(child, childPrefix, last);
    }
  });
}