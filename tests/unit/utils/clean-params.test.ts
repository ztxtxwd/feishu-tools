import { describe, it, expect } from "vitest";
import { cleanParams } from "../../../src/utils/clean-params.js";

describe("cleanParams", () => {
  it("should remove undefined values", () => {
    const result = cleanParams({
      a: 1,
      b: undefined,
      c: "test",
    });

    expect(result).toEqual({
      a: 1,
      c: "test",
    });
  });

  it("should keep null values", () => {
    const result = cleanParams({
      a: 1,
      b: null,
    });

    expect(result).toEqual({
      a: 1,
      b: null,
    });
  });

  it("should keep falsy values except undefined", () => {
    const result = cleanParams({
      a: 0,
      b: "",
      c: false,
      d: undefined,
    });

    expect(result).toEqual({
      a: 0,
      b: "",
      c: false,
    });
  });

  it("should return empty object when all values are undefined", () => {
    const result = cleanParams({
      a: undefined,
      b: undefined,
    });

    expect(result).toEqual({});
  });

  it("should return same object when no undefined values", () => {
    const input = {
      a: 1,
      b: "test",
      c: true,
    };

    const result = cleanParams(input);

    expect(result).toEqual(input);
  });
});
