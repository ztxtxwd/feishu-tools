import { describe, it, expect } from "vitest";
import { resolveToken } from "../../../src/utils/token.js";

describe("resolveToken", () => {
  it("should return undefined when provider is undefined", async () => {
    const result = await resolveToken(undefined);
    expect(result).toBeUndefined();
  });

  it("should return the string when provider is a string", async () => {
    const result = await resolveToken("static_token");
    expect(result).toBe("static_token");
  });

  it("should return empty string when provider is an empty string", async () => {
    const result = await resolveToken("");
    expect(result).toBe("");
  });

  it("should call the function and return result when provider is a sync function", async () => {
    const provider = () => "sync_token";
    const result = await resolveToken(provider);
    expect(result).toBe("sync_token");
  });

  it("should call the function and return result when provider is an async function", async () => {
    const provider = async () => "async_token";
    const result = await resolveToken(provider);
    expect(result).toBe("async_token");
  });

  it("should handle function that returns different values on each call", async () => {
    let callCount = 0;
    const provider = () => `token_${++callCount}`;

    const result1 = await resolveToken(provider);
    const result2 = await resolveToken(provider);

    expect(result1).toBe("token_1");
    expect(result2).toBe("token_2");
  });
});
