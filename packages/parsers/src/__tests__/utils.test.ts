import { describe, it, expect } from "vitest";
import { hashProjectName } from "../utils";

describe("hashProjectName", () => {
  it("is deterministic", () => {
    expect(hashProjectName("foo")).toBe(hashProjectName("foo"));
  });

  it("varies by input", () => {
    expect(hashProjectName("foo")).not.toBe(hashProjectName("bar"));
  });

  it("is 12 hex chars", () => {
    expect(hashProjectName("any-path/with stuff")).toMatch(/^[0-9a-f]{12}$/);
  });
});
