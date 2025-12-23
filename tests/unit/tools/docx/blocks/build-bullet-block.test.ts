import { describe, it, expect } from "vitest";
import { buildBulletBlock } from "../../../../../src/tools/docx/blocks/build-bullet-block.js";

describe("buildBulletBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildBulletBlock.name).toBe("build_bullet_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildBulletBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildBulletBlock.description).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build bullet block with correct block_type", async () => {
      const result = await buildBulletBlock.callback(context, {
        elements: [{ text_run: { content: "Bullet item" } }],
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 12,
        bullet: {
          elements: [{ text_run: { content: "Bullet item" } }],
        },
      });
    });

    it("should build bullet block with style", async () => {
      const result = await buildBulletBlock.callback(context, {
        elements: [{ text_run: { content: "Styled bullet" } }],
        style: { align: 2, folded: true },
      });

      expect(result.structuredContent).toEqual({
        block_type: 12,
        bullet: {
          elements: [{ text_run: { content: "Styled bullet" } }],
          style: { align: 2, folded: true },
        },
      });
    });

    it("should build bullet block with background color", async () => {
      const result = await buildBulletBlock.callback(context, {
        elements: [{ text_run: { content: "Colored bullet" } }],
        style: { background_color: "LightBlueBackground" },
      });

      expect(result.structuredContent.bullet.style).toEqual({
        background_color: "LightBlueBackground",
      });
    });

    it("should build bullet block with rich text elements", async () => {
      const result = await buildBulletBlock.callback(context, {
        elements: [
          { text_run: { content: "Normal " } },
          {
            text_run: {
              content: "bold",
              text_element_style: { bold: true },
            },
          },
          { mention_user: { user_id: "ou_abc123" } },
        ],
      });

      expect(result.structuredContent.bullet.elements).toHaveLength(3);
    });

    it("should return JSON string in content", async () => {
      const result = await buildBulletBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(12);
    });

    it("should not include style when not provided", async () => {
      const result = await buildBulletBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.structuredContent.bullet).not.toHaveProperty("style");
    });
  });
});
