import { describe, it, expect } from "vitest";
import { buildCalloutBlock } from "../../../../../src/tools/docx/blocks/build-callout-block.js";

describe("buildCalloutBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildCalloutBlock.name).toBe("build_callout_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildCalloutBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildCalloutBlock.description).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build a callout block with no options", async () => {
      const result = await buildCalloutBlock.callback(context, {});

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {},
      });
    });

    it("should build a callout block with emoji_id", async () => {
      const result = await buildCalloutBlock.callback(context, {
        emoji_id: "bulb",
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          emoji_id: "bulb",
        },
      });
    });

    it("should build a callout block with background_color", async () => {
      const result = await buildCalloutBlock.callback(context, {
        background_color: 3,
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          background_color: 3,
        },
      });
    });

    it("should build a callout block with border_color", async () => {
      const result = await buildCalloutBlock.callback(context, {
        border_color: 5,
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          border_color: 5,
        },
      });
    });

    it("should build a callout block with text_color", async () => {
      const result = await buildCalloutBlock.callback(context, {
        text_color: 1,
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          text_color: 1,
        },
      });
    });

    it("should build a callout block with all options", async () => {
      const result = await buildCalloutBlock.callback(context, {
        emoji_id: "star",
        background_color: 5,
        border_color: 5,
        text_color: 5,
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          emoji_id: "star",
          background_color: 5,
          border_color: 5,
          text_color: 5,
        },
      });
    });

    it("should build a warning-style callout", async () => {
      const result = await buildCalloutBlock.callback(context, {
        emoji_id: "warning",
        background_color: 3, // 浅黄
        border_color: 3, // 黄色边框
        text_color: 3, // 黄色文字
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          emoji_id: "warning",
          background_color: 3,
          border_color: 3,
          text_color: 3,
        },
      });
    });

    it("should build an error-style callout", async () => {
      const result = await buildCalloutBlock.callback(context, {
        emoji_id: "exclamation",
        background_color: 1, // 浅红
        border_color: 1, // 红色边框
        text_color: 1, // 红色文字
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          emoji_id: "exclamation",
          background_color: 1,
          border_color: 1,
          text_color: 1,
        },
      });
    });

    it("should build a success-style callout", async () => {
      const result = await buildCalloutBlock.callback(context, {
        emoji_id: "white_check_mark",
        background_color: 4, // 浅绿
        border_color: 4, // 绿色边框
        text_color: 4, // 绿色文字
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          emoji_id: "white_check_mark",
          background_color: 4,
          border_color: 4,
          text_color: 4,
        },
      });
    });

    it("should build an info-style callout", async () => {
      const result = await buildCalloutBlock.callback(context, {
        emoji_id: "bulb",
        background_color: 5, // 浅蓝
        border_color: 5, // 蓝色边框
        text_color: 5, // 蓝色文字
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          emoji_id: "bulb",
          background_color: 5,
          border_color: 5,
          text_color: 5,
        },
      });
    });

    it("should return JSON string in content", async () => {
      const result = await buildCalloutBlock.callback(context, {
        emoji_id: "memo",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(19);
      expect(parsed.callout.emoji_id).toBe("memo");
    });

    it("should not include undefined properties", async () => {
      const result = await buildCalloutBlock.callback(context, {
        emoji_id: "star",
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          emoji_id: "star",
        },
      });
      // 确保没有 undefined 值
      expect(result.structuredContent.callout).not.toHaveProperty(
        "background_color"
      );
      expect(result.structuredContent.callout).not.toHaveProperty(
        "border_color"
      );
      expect(result.structuredContent.callout).not.toHaveProperty("text_color");
    });

    it("should support medium color range for background", async () => {
      const result = await buildCalloutBlock.callback(context, {
        background_color: 12, // 中蓝色
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          background_color: 12,
        },
      });
    });

    it("should support gray color range for background", async () => {
      const result = await buildCalloutBlock.callback(context, {
        background_color: 14, // 灰色
      });

      expect(result.structuredContent).toEqual({
        block_type: 19,
        callout: {
          background_color: 14,
        },
      });
    });
  });
});
