import { password, confirm } from "@inquirer/prompts";
import pc from "picocolors";
import { stripVTControlCharacters } from "node:util";

export { pc };

// ── Formatting helpers ─────────────────────────────────────────────────────

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${size.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

function visibleLen(text) {
  return stripVTControlCharacters(String(text)).length;
}

function padVisible(text, width) {
  const pad = Math.max(0, width - visibleLen(text));
  return text + " ".repeat(pad);
}

function wrapText(text, width) {
  const words = String(text).split(/(\s+)/u);
  const lines = [];
  let current = "";
  for (let word of words) {
    while (visibleLen(word) > width) {
      if (current.trim()) { lines.push(current.trimEnd()); current = ""; }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (visibleLen(current + word) > width && current.trim()) {
      lines.push(current.trimEnd());
      current = word.trimStart();
    } else {
      current += word;
    }
  }
  if (current.trim()) lines.push(current.trimEnd());
  return lines.length > 0 ? lines : [text];
}

export function renderRows(rows, { wrapWidth } = {}) {
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map(([key]) => visibleLen(String(key))));
  return rows.map(([key, value]) => {
    const visible = visibleLen(String(key));
    const indent = " ".repeat(Math.max(1, width - visible + 2));
    const valStr = String(value ?? "");
    if (wrapWidth) {
      const prefix = `${key}${indent}`;
      const prefixLen = visibleLen(prefix);
      const availWidth = wrapWidth - prefixLen;
      if (visibleLen(valStr) > availWidth) {
        const lines = wrapText(valStr, availWidth);
        return [prefix + lines[0], ...lines.slice(1).map((l) => " ".repeat(prefixLen) + l)].join("\n");
      }
    }
    return `${key}${indent}${valStr}`;
  }).join("\n");
}

export function renderCard(title, body, options = {}) {
  const borderColor = options.formatBorder ?? pc.magenta;
  const maxCols = options.columns ?? process.stdout.columns ?? 88;
  const rawLines = String(body ?? "").split("\n");
  const titleStr = title ? ` ${title} ` : "";
  const innerWidth = Math.max(
    visibleLen(titleStr),
    ...rawLines.map(visibleLen),
  );
  const contentWidth = Math.min(innerWidth, maxCols - 4);
  const width = contentWidth + 2;

  const lines = [];
  for (const line of rawLines) {
    if (visibleLen(line) > contentWidth) {
      lines.push(...wrapText(line, contentWidth));
    } else {
      lines.push(line);
    }
  }

  const topTitle = title ? `╭${pc.reset(titleStr)}` : "╭";
  const topFill = "─".repeat(Math.max(0, width + 2 - visibleLen(titleStr)));
  const top = `${topTitle}${topFill}╮`;
  const middle = lines.map((line) => `│ ${padVisible(line, contentWidth)} │`);
  const bottom = `╰${"─".repeat(width + 2)}╯`;

  return [top, ...middle, bottom].map((l) => borderColor(l)).join("\n");
}

// ── Prompt helpers ──────────────────────────────────────────────────────────

function withEscape() {
  const controller = new AbortController();
  let escapeTimer = null;
  const onData = (data) => {
    if (data.length === 1 && data[0] === 0x1b) {
      escapeTimer = setTimeout(() => controller.abort(), 50);
    } else if (escapeTimer) {
      clearTimeout(escapeTimer);
      escapeTimer = null;
    }
  };
  process.stdin.on("data", onData);
  const cleanup = () => {
    process.stdin.removeListener("data", onData);
    if (escapeTimer) clearTimeout(escapeTimer);
  };
  return { signal: controller.signal, cleanup };
}

async function runPrompt(fn, config) {
  const { signal, cleanup } = withEscape();
  try {
    return await fn(config, { signal });
  } catch (err) {
    if (err.name === "AbortPromptError") {
      console.log(pc.dim("\nCancelled."));
      process.exit(0);
    }
    throw err;
  } finally {
    cleanup();
  }
}

export async function promptPassword(label, { confirm: needsConfirm = false } = {}) {
  const value = await runPrompt(password, {
    message: label,
    mask: true,
  });
  if (!value) throw new Error("Password cannot be empty.");
  if (needsConfirm) {
    const again = await runPrompt(password, {
      message: "Confirm passphrase",
      mask: true,
    });
    if (value !== again) throw new Error("Passphrases do not match.");
  }
  return value;
}

export async function promptYesNo(label, defaultValue) {
  return await runPrompt(confirm, { message: label, default: defaultValue });
}

// ── Option parsing ──────────────────────────────────────────────────────────

export function parseOptions(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (item === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (item.startsWith("--")) {
      const [key, inlineValue] = item.slice(2).split(/=(.*)/u, 2);
      const next = argv[i + 1];
      if (inlineValue !== undefined) options[key] = inlineValue;
      else if (next && !next.startsWith("-")) { options[key] = next; i += 1; }
      else options[key] = true;
    } else if (/^-[A-Za-z]+$/u.test(item)) {
      for (const key of item.slice(1)) options[key] = true;
    } else {
      positional.push(item);
    }
  }
  return { positional, options };
}