import { encryptCommand } from "./commands/encrypt.mjs";
import { decryptCommand } from "./commands/decrypt.mjs";
import { listCommand } from "./commands/list.mjs";
import { printHelp, printVersion } from "./commands/help.mjs";
import {
  checkForAppUpdate,
  checkForDependencyUpdate,
  detectInvocation,
  updateCommand,
  runUpdateCommand,
} from "./updates.mjs";
import { pc, promptYesNo } from "./ui.mjs";

async function offerUpdate(argv) {
  const [appUpdate, depUpdate] = await Promise.all([
    checkForAppUpdate(),
    checkForDependencyUpdate(),
  ]);
  if (!appUpdate && !depUpdate) return false;

  const invocation = detectInvocation();

  if (appUpdate) {
    const plan = updateCommand(invocation, argv);
    console.log(pc.yellow(`\nUpdate available: age-vault v${appUpdate.current} → v${appUpdate.latest}`));
    console.log(pc.dim(`Run: ${plan.display}`));
    console.log();
  }

  if (depUpdate) {
    console.log(pc.cyan(`Dependency update available: age-encryption v${depUpdate.current} → v${depUpdate.latest}`));
    console.log(pc.dim("Reinstall age-vault to pick up the latest crypto library."));
    console.log();
  }

  if (!process.stdin.isTTY) return false;
  if (!appUpdate) return false; // Only offer interactive update for app updates

  try {
    const shouldUpdate = await promptYesNo("Update age-vault now?", false);
    if (!shouldUpdate) return false;
    const plan = updateCommand(invocation, argv);
    await runUpdateCommand(plan);
    if (plan.mode === "install-global") {
      console.log(pc.green("Updated. Run age-vault again to use the new version."));
    }
    return true;
  } catch {
    return false;
  }
}

// Avoid importing createPrompt until needed (keeps help/version fast)

export async function run(argv) {
  if (argv.length === 0) {
    if (await offerUpdate(argv)) return;
    printHelp();
    return;
  }

  const [command] = argv;

  if (command === "help" || command === "--help" || command === "-h") return printHelp();
  if (command === "version" || command === "--version" || command === "-v") return printVersion();

  if (command === "-e" || command === "encrypt") return encryptCommand(argv.slice(1));
  if (command === "-d" || command === "decrypt") return decryptCommand(argv.slice(1));
  if (command === "-l" || command === "list") return listCommand(argv.slice(1));
  if (command === "-ls") return listCommand(["--status", ...argv.slice(1)]);

  throw new Error(`Unknown command: ${command}. Run age-vault --help`);
}