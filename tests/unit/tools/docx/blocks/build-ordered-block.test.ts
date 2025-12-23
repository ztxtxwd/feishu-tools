import { describe, it, expect } from "vitest";
import { buildOrderedBlock } from "../../../../../src/tools/docx/blocks/build-ordered-block.js";

describe("buildOrderedBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildOrderedBlock.name).toBe("build_ordered_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildOrderedBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildOrderedBlock.description).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build ordered block with correct block_type", async () => {
      const result = await buildOrderedBlock.callback(context, {
        elements: [{ text_run: { content: "Step 1" } }],
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 13,
        ordered: {
          elements: [{ text_run: { content: "Step 1" } }],
        },
      });
    });

    it("should build ordered block with style", async () => {
      const result = await buildOrderedBlock.callback(context, {
        elements: [{ text_run: { content: "Styled step" } }],
        style: { align: 2, folded: true },
      });

      expect(result.structuredContent).toEqual({
        block_type: 13,
        ordered: {
          elements: [{ text_run: { content: "Styled step" } }],
          style: { align: 2, folded: true },
        },
      });
    });

    it("should build ordered block with background color", async () => {
      const result = await buildOrderedBlock.callback(context, {
        elements: [{ text_run: { content: "Colored step" } }],
        style: { background_color: "LightGreenBackground" },
      });

      expect(result.structuredContent.ordered.style).toEqual({
        background_color: "LightGreenBackground",
      });
    });

    it("should build ordered block with rich text elements", async () => {
      const result = await buildOrderedBlock.callback(context, {
        elements: [
          { text_run: { content: "Click " } },
          {
            text_run: {
              content: "here",
              text_element_style: {
                link: { url: "https%3A%2F%2Fexample.com" },
              },
            },
          },
        ],
      });

      expect(result.structuredContent.ordered.elements).toHaveLength(2);
    });

    it("should return JSON string in content", async () => {
      const result = await buildOrderedBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(13);
    });

    it("should not include style when not provided", async () => {
      const result = await buildOrderedBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.structuredContent.ordered).not.toHaveProperty("style");
    });
  });
});
