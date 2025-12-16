import { describe, it, expect } from "vitest";
import { formatDescription } from "../../../src/types.js";

describe("formatDescription", () => {
  it("should return string as-is when description is a string", () => {
    const result = formatDescription("这是一个简单的描述");
    expect(result).toBe("这是一个简单的描述");
  });

  it("should return empty string as-is", () => {
    const result = formatDescription("");
    expect(result).toBe("");
  });

  it("should format structured description with only summary", () => {
    const result = formatDescription({
      summary: "获取用户信息",
    });
    expect(result).toBe("获取用户信息");
  });

  it("should format structured description with summary and bestFor", () => {
    const result = formatDescription({
      summary: "获取用户信息",
      bestFor: "获取当前登录用户的基本信息",
    });
    expect(result).toBe("获取用户信息\n\n**适用于:** 获取当前登录用户的基本信息");
  });

  it("should format structured description with summary and notRecommendedFor", () => {
    const result = formatDescription({
      summary: "获取用户信息",
      notRecommendedFor: "获取其他用户的信息",
    });
    expect(result).toBe("获取用户信息\n\n**不适用于:** 获取其他用户的信息");
  });

  it("should format structured description with all fields", () => {
    const result = formatDescription({
      summary: "获取用户信息",
      bestFor: "获取当前登录用户的基本信息",
      notRecommendedFor: "获取其他用户的信息",
    });
    expect(result).toBe(
      "获取用户信息\n\n**适用于:** 获取当前登录用户的基本信息\n\n**不适用于:** 获取其他用户的信息"
    );
  });

  it("should handle empty bestFor and notRecommendedFor", () => {
    const result = formatDescription({
      summary: "获取用户信息",
      bestFor: "",
      notRecommendedFor: "",
    });
    // Empty strings are falsy, so they should be skipped
    expect(result).toBe("获取用户信息");
  });
});
