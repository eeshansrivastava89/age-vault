import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "age-vault";
const DEPENDENCY_NAME = "age-encryption";

// ── Package info ────────────────────────────────────────────────────────────

let _pkg = null;
function packageJson() {
  if (_pkg) return _pkg;
  const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
  _pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return _pkg;
}

export function currentPackageVersion() {
  return packageJson().version;
}

function currentDependencyVersion() {
  const deps = packageJson().dependencies ?? {};
  const raw = deps[DEPENDENCY_NAME];
  if (!raw) return null;
  // Strip npm range chars (^, ~, >=, etc.) — best-effort parse
  const match = raw.match(/(\d+(?:\.\d+){0,2})/u);
  return match ? match[1] : null;
}

// ── Version comparison ────────────────────────────────────────────────────────

export function isNewerVersion(candidate, current) {
  return compareVersions(candidate, current) > 0;
}

export function compareVersions(a, b) {
  const left = versionParts(a);
  const right = versionParts(b);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function versionParts(value) {
  return String(value)
    .replace(/^v/u, "")
    .split(/[.-]/u)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

// ── Registry fetch ────────────────────────────────────────────────────────────

async function fetchLatestVersion(name, { fetchImpl = globalThis.fetch } = {}) {
  try {
    const response = await fetchImpl(`https://registry.npmjs.org/${name}/latest`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return typeof body?.version === "string" ? body.version : null;
  } catch {
    return null;
  }
}

// ── Public update checks ─────────────────────────────────────────────────────

/**
 * Check if a newer age-vault version is available on npm.
 * @returns {Promise<{current: string, latest: string} | null>}
 */
export async function checkForAppUpdate({ fetchImpl } = {}) {
  if (process.env.AGE_VAULT_NO_UPDATE_CHECK) return null;
  const current = currentPackageVersion();
  const latest = await fetchLatestVersion(PACKAGE_NAME, { fetchImpl });
  if (!latest) return null;
  return isNewerVersion(latest, current) ? { current, latest } : null;
}

/**
 * Check if a newer age-encryption version is available on npm.
 * @returns {Promise<{current: string, latest: string} | null>}
 */
export async function checkForDependencyUpdate({ fetchImpl } = {}) {
  if (process.env.AGE_VAULT_NO_UPDATE_CHECK) return null;
  const current = currentDependencyVersion();
  if (!current) return null;
  const latest = await fetchLatestVersion(DEPENDENCY_NAME, { fetchImpl });
  if (!latest) return null;
  return isNewerVersion(latest, current) ? { current, latest } : null;
}

// ── Invocation detection + update command ─────────────────────────────────────

export function detectInvocation(env = process.env) {
  const execPath = env.npm_execpath ?? "";
  if (/(^|[\\/])npx-cli\.js$/u.test(execPath)) return "npx";
  if (env.npm_command === "exec") return "npx";
  return "global";
}

export function updateCommand(invocation = detectInvocation(), argv = []) {
  if (invocation === "npx") {
    const args = ["exec", "--yes", "--", `${PACKAGE_NAME}@latest`, ...argv];
    return {
      cmd: "npm",
      args,
      display: shellCommand("npm", args),
      mode: "run-latest",
    };
  }

  const args = ["install", "-g", `${PACKAGE_NAME}@latest`];
  return {
    cmd: "npm",
    args,
    display: shellCommand("npm", args),
    mode: "install-global",
  };
}

export function runUpdateCommand(plan) {
  return new Promise((resolve, reject) => {
    const child = spawn(plan.cmd, plan.args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${plan.cmd} exited with code ${code}`)));
  });
}

// ── Shell helpers ─────────────────────────────────────────────────────────────

function shellCommand(cmd, args) {
  return [cmd, ...args.map(shellQuote)].join(" ");
}

function shellQuote(value) {
  const text = String(value);
  return /^[A-Za-z0-9_./:@=-]+$/u.test(text) ? text : JSON.stringify(text);
}