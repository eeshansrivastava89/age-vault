import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "age-vault-cli-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("CLI smoke tests", () => {
  it("prints help with no args", async () => {
    const { run } = await import("../src/cli.mjs");
    const origLog = console.log;
    let output = "";
    console.log = (...args) => { output += args.join(" ") + "\n"; };
    try {
      await run([]);
      assert.ok(output.includes("age-vault"));
      assert.ok(output.includes("Encrypt"));
      assert.ok(output.includes("Decrypt"));
    } finally {
      console.log = origLog;
    }
  });

  it("prints help with --help", async () => {
    const { run } = await import("../src/cli.mjs");
    const origLog = console.log;
    let output = "";
    console.log = (...args) => { output += args.join(" ") + "\n"; };
    try {
      await run(["--help"]);
      assert.ok(output.includes("age-vault"));
    } finally {
      console.log = origLog;
    }
  });

  it("prints version with --version", async () => {
    const { run } = await import("../src/cli.mjs");
    const origLog = console.log;
    let output = "";
    console.log = (...args) => { output += args.join(" ") + "\n"; };
    try {
      await run(["--version"]);
      assert.match(output, /age-vault v/);
    } finally {
      console.log = origLog;
    }
  });

  it("rejects unknown command", async () => {
    const { run } = await import("../src/cli.mjs");
    await assert.rejects(
      () => run(["bogus"]),
      /Unknown command/,
    );
  });
});