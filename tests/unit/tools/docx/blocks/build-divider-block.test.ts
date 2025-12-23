import { describe, it, expect } from "vitest";
import { buildDividerBlock } from "../../../../../src/tools/docx/blocks/build-divider-block.js";

describe("buildDividerBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildDividerBlock.name).toBe("build_divider_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildDividerBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildDividerBlock.description).toBeDefined();
    });

    it("should have inputSchema", () => {
      expect(buildDividerBlock.inputSchema).toBeDefined();
    });

    it("should have outputSchema", () => {
      expect(buildDividerBlock.outputSchema).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build a divider block with empty divider object", async () => {
      const result = await buildDividerBlock.callback(context, {});

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 22,
        divider: {},
      });
    });

    it("should return correct block_type (22)", async () => {
      const result = await buildDividerBlock.callback(context, {});

      expect(result.structuredContent.block_type).toBe(22);
    });

    it("should return JSON string in content", async () => {
      const result = await buildDividerBlock.callback(context, {});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(22);
      expect(parsed.divider).toEqual({});
    });

    it("should return structuredContent", async () => {
      const result = await buildDividerBlock.callback(context, {});

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent).toEqual({
        block_type: 22,
        divider: {},
      });
    });

    it("should ignore any extra arguments passed", async () => {
      // TypeScript would prevent this, but testing runtime behavior
      const result = await buildDividerBlock.callback(context, {
        extra: "ignored",
      } as Record<string, unknown>);

      expect(result.structuredContent).toEqual({
        block_type: 22,
        divider: {},
      });
    });
  });
});
