import { describe, it, expect } from "vitest";
import {
  buildTextBlock,
  buildSimpleTextBlock,
} from "../../../../../src/tools/docx/blocks/build-text-block.js";

describe("buildTextBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildTextBlock.name).toBe("build_text_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildTextBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildTextBlock.description).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build a simple text block with text_run", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [{ text_run: { content: "Hello World" } }],
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [{ text_run: { content: "Hello World" } }],
        },
      });
    });

    it("should build text block with style", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [{ text_run: { content: "Centered text" } }],
        style: { align: 2 },
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [{ text_run: { content: "Centered text" } }],
          style: { align: 2 },
        },
      });
    });

    it("should build text block with full style options", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [{ text_run: { content: "Styled text" } }],
        style: {
          align: 3,
          folded: true,
          background_color: "LightBlueBackground",
          indentation_level: "OneLevelIndent",
        },
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [{ text_run: { content: "Styled text" } }],
          style: {
            align: 3,
            folded: true,
            background_color: "LightBlueBackground",
            indentation_level: "OneLevelIndent",
          },
        },
      });
    });

    it("should build text block with text_element_style", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [
          {
            text_run: {
              content: "Bold and red",
              text_element_style: {
                bold: true,
                text_color: 1,
              },
            },
          },
        ],
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [
            {
              text_run: {
                content: "Bold and red",
                text_element_style: {
                  bold: true,
                  text_color: 1,
                },
              },
            },
          ],
        },
      });
    });

    it("should build text block with link", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [
          {
            text_run: {
              content: "Click here",
              text_element_style: {
                link: { url: "https%3A%2F%2Fexample.com" },
              },
            },
          },
        ],
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [
            {
              text_run: {
                content: "Click here",
                text_element_style: {
                  link: { url: "https%3A%2F%2Fexample.com" },
                },
              },
            },
          ],
        },
      });
    });

    it("should build text block with multiple elements", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [
          { text_run: { content: "Normal " } },
          {
            text_run: {
              content: "bold",
              text_element_style: { bold: true },
            },
          },
          { text_run: { content: " text" } },
        ],
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [
            { text_run: { content: "Normal " } },
            {
              text_run: {
                content: "bold",
                text_element_style: { bold: true },
              },
            },
            { text_run: { content: " text" } },
          ],
        },
      });
    });

    it("should build text block with mention_user", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [
          { text_run: { content: "Hello " } },
          { mention_user: { user_id: "ou_abc123" } },
        ],
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [
            { text_run: { content: "Hello " } },
            { mention_user: { user_id: "ou_abc123" } },
          ],
        },
      });
    });

    it("should build text block with mention_doc", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [
          { text_run: { content: "See " } },
          {
            mention_doc: {
              token: "doxcnXYZ",
              obj_type: 22,
              url: "https%3A%2F%2Ffeishu.cn%2Fdocx%2FdoxcnXYZ",
              title: "My Document",
            },
          },
        ],
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [
            { text_run: { content: "See " } },
            {
              mention_doc: {
                token: "doxcnXYZ",
                obj_type: 22,
                url: "https%3A%2F%2Ffeishu.cn%2Fdocx%2FdoxcnXYZ",
                title: "My Document",
              },
            },
          ],
        },
      });
    });

    it("should build text block with reminder", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [
          {
            reminder: {
              create_user_id: "ou_abc123",
              expire_time: "1641967200000",
              notify_time: "1643166000000",
              is_whole_day: true,
            },
          },
        ],
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [
            {
              reminder: {
                create_user_id: "ou_abc123",
                expire_time: "1641967200000",
                notify_time: "1643166000000",
                is_whole_day: true,
              },
            },
          ],
        },
      });
    });

    it("should build text block with equation", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [
          { text_run: { content: "The formula is " } },
          { equation: { content: "E=mc^2" } },
        ],
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [
            { text_run: { content: "The formula is " } },
            { equation: { content: "E=mc^2" } },
          ],
        },
      });
    });

    it("should return JSON string in content", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(2);
    });

    it("should not include style when not provided", async () => {
      const result = await buildTextBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [{ text_run: { content: "test" } }],
        },
      });
      expect(result.structuredContent.text).not.toHaveProperty("style");
    });
  });
});

describe("buildSimpleTextBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildSimpleTextBlock.name).toBe("build_simple_text_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildSimpleTextBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildSimpleTextBlock.description).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build a simple text block from content string", async () => {
      const result = await buildSimpleTextBlock.callback(context, {
        content: "Hello World",
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [{ text_run: { content: "Hello World" } }],
        },
      });
    });

    it("should build text block with style", async () => {
      const result = await buildSimpleTextBlock.callback(context, {
        content: "Centered text",
        style: { align: 2 },
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [{ text_run: { content: "Centered text" } }],
          style: { align: 2 },
        },
      });
    });

    it("should handle empty content", async () => {
      const result = await buildSimpleTextBlock.callback(context, {
        content: "",
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [{ text_run: { content: "" } }],
        },
      });
    });

    it("should handle content with newlines", async () => {
      const result = await buildSimpleTextBlock.callback(context, {
        content: "Line 1\nLine 2",
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [{ text_run: { content: "Line 1\nLine 2" } }],
        },
      });
    });

    it("should support all style options", async () => {
      const result = await buildSimpleTextBlock.callback(context, {
        content: "Styled",
        style: {
          align: 1,
          folded: false,
          background_color: "LightYellowBackground",
          indentation_level: "NoIndent",
        },
      });

      expect(result.structuredContent).toEqual({
        block_type: 2,
        text: {
          elements: [{ text_run: { content: "Styled" } }],
          style: {
            align: 1,
            folded: false,
            background_color: "LightYellowBackground",
            indentation_level: "NoIndent",
          },
        },
      });
    });

    it("should return JSON string in content", async () => {
      const result = await buildSimpleTextBlock.callback(context, {
        content: "test",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(2);
      expect(parsed.text.elements[0].text_run.content).toBe("test");
    });
  });
});
