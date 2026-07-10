import { describe, expect, it } from "vitest";
import {
  decodeShareHash,
  encodeShareHash,
  MAX_SHARE_SOURCE_LENGTH,
  ShareSourceTooLargeError,
} from "../src/share/permalink";

describe("encodeShareHash / decodeShareHash", () => {
  it("round-trips a JavaScript paste", () => {
    const state = { language: "javascript" as const, source: "function normalize(iso) {\n  return iso;\n}" };
    const decoded = decodeShareHash(encodeShareHash(state));
    expect(decoded).toEqual(state);
  });

  it("round-trips a Python paste", () => {
    const state = { language: "python" as const, source: "def normalize(iso, time_zone):\n    return iso" };
    const decoded = decodeShareHash(encodeShareHash(state));
    expect(decoded).toEqual(state);
  });

  it("round-trips source containing characters that need percent-encoding", () => {
    const state = {
      language: "javascript" as const,
      source: "function normalize(iso) {\n  return `${iso} & friends #1 = 100%`;\n}",
    };
    const decoded = decodeShareHash(encodeShareHash(state));
    expect(decoded).toEqual(state);
  });

  it("produces a hash starting with '#'", () => {
    expect(encodeShareHash({ language: "javascript", source: "x" })).toMatch(/^#/);
  });

  it("throws ShareSourceTooLargeError for source beyond the size limit", () => {
    const source = "a".repeat(MAX_SHARE_SOURCE_LENGTH + 1);
    expect(() => encodeShareHash({ language: "javascript", source })).toThrow(ShareSourceTooLargeError);
  });

  it("accepts source exactly at the size limit", () => {
    const source = "a".repeat(MAX_SHARE_SOURCE_LENGTH);
    expect(() => encodeShareHash({ language: "javascript", source })).not.toThrow();
  });

  it("returns null for an empty hash", () => {
    expect(decodeShareHash("")).toBeNull();
    expect(decodeShareHash("#")).toBeNull();
  });

  it("returns null when the language is missing or unrecognized", () => {
    expect(decodeShareHash("#src=hello")).toBeNull();
    expect(decodeShareHash("#src=hello&lang=ruby")).toBeNull();
  });

  it("returns null when the source is missing", () => {
    expect(decodeShareHash("#lang=javascript")).toBeNull();
  });

  it("accepts a hash without a leading '#'", () => {
    expect(decodeShareHash("lang=python&src=x")).toEqual({ language: "python", source: "x" });
  });

  it("round-trips an empty-string source distinctly from a missing one", () => {
    expect(decodeShareHash(encodeShareHash({ language: "javascript", source: "" }))).toEqual({
      language: "javascript",
      source: "",
    });
  });
});
