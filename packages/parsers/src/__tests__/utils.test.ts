import { describe, it, expect } from "vitest";
import { hashProjectName } from "../utils";

describe("hashProjectName", () => {
  it("is deterministic", () => {
    expect(hashProjectName("/Users/me/projects/foo")).toBe(hashProjectName("/Users/me/projects/foo"));
  });

  it("extracts basename", () => {
    expect(hashProjectName("/Users/me/projects/devstats")).toBe("devstats");
    expect(hashProjectName("/home/user/code/my-app")).toBe("my-app");
  });

  it("varies by folder name", () => {
    expect(hashProjectName("/a/foo")).not.toBe(hashProjectName("/a/bar"));
  });

  it("handles bare names", () => {
    expect(hashProjectName("foo")).toBe("foo");
  });
});
