import { describe, it, expect } from "vitest";
import { buildQuoteBlock } from "../../../../../src/tools/docx/blocks/build-quote-block.js";

describe("buildQuoteBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildQuoteBlock.name).toBe("build_quote_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildQuoteBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildQuoteBlock.description).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build quote block with correct block_type", async () => {
      const result = await buildQuoteBlock.callback(context, {
        elements: [{ text_run: { content: "A wise quote" } }],
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 15,
        quote: {
          elements: [{ text_run: { content: "A wise quote" } }],
        },
      });
    });

    it("should build quote block with style", async () => {
      const result = await buildQuoteBlock.callback(context, {
        elements: [{ text_run: { content: "Styled quote" } }],
        style: { align: 2 },
      });

      expect(result.structuredContent).toEqual({
        block_type: 15,
        quote: {
          elements: [{ text_run: { content: "Styled quote" } }],
          style: { align: 2 },
        },
      });
    });

    it("should build quote block with background color", async () => {
      const result = await buildQuoteBlock.callback(context, {
        elements: [{ text_run: { content: "Colored quote" } }],
        style: { background_color: "LightPurpleBackground" },
      });

      expect(result.structuredContent.quote.style).toEqual({
        background_color: "LightPurpleBackground",
      });
    });

    it("should build quote block with rich text elements", async () => {
      const result = await buildQuoteBlock.callback(context, {
        elements: [
          {
            text_run: {
              content: "Italic quote",
              text_element_style: { italic: true },
            },
          },
          { text_run: { content: " - Author" } },
        ],
      });

      expect(result.structuredContent.quote.elements).toHaveLength(2);
    });

    it("should build quote block with mention", async () => {
      const result = await buildQuoteBlock.callback(context, {
        elements: [
          { text_run: { content: "As " } },
          { mention_user: { user_id: "ou_abc123" } },
          { text_run: { content: " said..." } },
        ],
      });

      expect(result.structuredContent.quote.elements).toHaveLength(3);
      expect(result.structuredContent.quote.elements[1]).toEqual({
        mention_user: { user_id: "ou_abc123" },
      });
    });

    it("should return JSON string in content", async () => {
      const result = await buildQuoteBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(15);
    });

    it("should not include style when not provided", async () => {
      const result = await buildQuoteBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.structuredContent.quote).not.toHaveProperty("style");
    });
  });
});
