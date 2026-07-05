import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseOptions } from "../src/ui.mjs";

describe("parseOptions", () => {
  it("parses short flags as booleans", () => {
    const { options, positional } = parseOptions(["-e", "file.txt"]);
    assert.equal(options.e, true);
    assert.deepEqual(positional, ["file.txt"]);
  });

  it("parses long flags with inline value", () => {
    const { options } = parseOptions(["--armor=true"]);
    assert.equal(options.armor, "true");
  });

  it("parses long flags with next-arg value", () => {
    const { options, positional } = parseOptions(["--keep", "file.txt"]);
    assert.equal(options.keep, "file.txt");
    assert.deepEqual(positional, []);
  });

  it("parses boolean long flags", () => {
    const { options } = parseOptions(["--status"]);
    assert.equal(options.status, true);
  });

  it("collects positional args", () => {
    const { positional } = parseOptions(["a.txt", "b.txt"]);
    assert.deepEqual(positional, ["a.txt", "b.txt"]);
  });

  it("respects -- terminator", () => {
    const { positional } = parseOptions(["--", "-e", "file"]);
    assert.deepEqual(positional, ["-e", "file"]);
  });
});