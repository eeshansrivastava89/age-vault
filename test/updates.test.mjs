import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  isNewerVersion,
  detectInvocation,
  updateCommand,
  checkForAppUpdate,
  checkForDependencyUpdate,
} from "../src/updates.mjs";

describe("compareVersions", () => {
  it("compares semver-style versions", () => {
    assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
    assert.ok(compareVersions("1.2.0", "1.0.0") > 0);
    assert.ok(compareVersions("0.9.0", "1.0.0") < 0);
  });

  it("handles different segment counts", () => {
    assert.ok(compareVersions("1.2", "1.2.0") === 0);
    assert.ok(compareVersions("1.2.1", "1.2") > 0);
  });

  it("strips leading v", () => {
    assert.equal(compareVersions("v1.0.0", "1.0.0"), 0);
  });
});

describe("isNewerVersion", () => {
  it("returns true when candidate is newer", () => {
    assert.equal(isNewerVersion("1.1.0", "1.0.0"), true);
    assert.equal(isNewerVersion("1.0.0", "1.0.0"), false);
    assert.equal(isNewerVersion("0.9.0", "1.0.0"), false);
  });
});

describe("detectInvocation", () => {
  it("detects npx via npm_execpath", () => {
    assert.equal(detectInvocation({ npm_execpath: "/usr/local/bin/npx-cli.js" }), "npx");
  });

  it("detects npx via npm_command", () => {
    assert.equal(detectInvocation({ npm_command: "exec" }), "npx");
  });

  it("defaults to global", () => {
    assert.equal(detectInvocation({}), "global");
  });
});

describe("updateCommand", () => {
  it("returns npx-style command for npx invocation", () => {
    const plan = updateCommand("npx", ["--help"]);
    assert.equal(plan.cmd, "npm");
    assert.equal(plan.mode, "run-latest");
    assert.ok(plan.display.includes("age-vault@latest"));
  });

  it("returns global install command for global invocation", () => {
    const plan = updateCommand("global");
    assert.equal(plan.cmd, "npm");
    assert.equal(plan.mode, "install-global");
    assert.ok(plan.display.includes("install -g"));
  });
});

describe("checkForAppUpdate", () => {
  it("returns null when AGE_VAULT_NO_UPDATE_CHECK is set", async () => {
    const orig = process.env.AGE_VAULT_NO_UPDATE_CHECK;
    process.env.AGE_VAULT_NO_UPDATE_CHECK = "1";
    try {
      const result = await checkForAppUpdate();
      assert.equal(result, null);
    } finally {
      if (orig === undefined) delete process.env.AGE_VAULT_NO_UPDATE_CHECK;
      else process.env.AGE_VAULT_NO_UPDATE_CHECK = orig;
    }
  });

  it("returns null when fetch fails", async () => {
    const failingFetch = async () => { throw new Error("network down"); };
    const orig = process.env.AGE_VAULT_NO_UPDATE_CHECK;
    delete process.env.AGE_VAULT_NO_UPDATE_CHECK;
    try {
      const result = await checkForAppUpdate({ fetchImpl: failingFetch });
      assert.equal(result, null);
    } finally {
      if (orig !== undefined) process.env.AGE_VAULT_NO_UPDATE_CHECK = orig;
    }
  });

  it("returns null when registry version is not newer", async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({ version: "0.0.1" }), // older than current
    });
    const orig = process.env.AGE_VAULT_NO_UPDATE_CHECK;
    delete process.env.AGE_VAULT_NO_UPDATE_CHECK;
    try {
      const result = await checkForAppUpdate({ fetchImpl: fakeFetch });
      assert.equal(result, null);
    } finally {
      if (orig !== undefined) process.env.AGE_VAULT_NO_UPDATE_CHECK = orig;
    }
  });

  it("returns update info when registry version is newer", async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({ version: "99.0.0" }), // much newer
    });
    const orig = process.env.AGE_VAULT_NO_UPDATE_CHECK;
    delete process.env.AGE_VAULT_NO_UPDATE_CHECK;
    try {
      const result = await checkForAppUpdate({ fetchImpl: fakeFetch });
      assert.ok(result, "should return update info");
      assert.equal(result.latest, "99.0.0");
      assert.equal(typeof result.current, "string");
    } finally {
      if (orig !== undefined) process.env.AGE_VAULT_NO_UPDATE_CHECK = orig;
    }
  });
});

describe("checkForDependencyUpdate", () => {
  it("returns null when fetch fails", async () => {
    const failingFetch = async () => { throw new Error("network down"); };
    const orig = process.env.AGE_VAULT_NO_UPDATE_CHECK;
    delete process.env.AGE_VAULT_NO_UPDATE_CHECK;
    try {
      const result = await checkForDependencyUpdate({ fetchImpl: failingFetch });
      assert.equal(result, null);
    } finally {
      if (orig !== undefined) process.env.AGE_VAULT_NO_UPDATE_CHECK = orig;
    }
  });
});