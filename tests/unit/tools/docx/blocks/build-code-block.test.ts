import { describe, it, expect } from "vitest";
import { buildCodeBlock } from "../../../../../src/tools/docx/blocks/build-code-block.js";

describe("buildCodeBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildCodeBlock.name).toBe("build_code_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildCodeBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildCodeBlock.description).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build code block with correct block_type", async () => {
      const result = await buildCodeBlock.callback(context, {
        elements: [{ text_run: { content: "console.log('Hello');" } }],
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 14,
        code: {
          elements: [{ text_run: { content: "console.log('Hello');" } }],
        },
      });
    });

    it("should build code block with language", async () => {
      const result = await buildCodeBlock.callback(context, {
        elements: [{ text_run: { content: "const x = 1;" } }],
        style: { language: 63 }, // TypeScript
      });

      expect(result.structuredContent).toEqual({
        block_type: 14,
        code: {
          elements: [{ text_run: { content: "const x = 1;" } }],
          style: { language: 63 },
        },
      });
    });

    it("should build code block with wrap enabled", async () => {
      const result = await buildCodeBlock.callback(context, {
        elements: [{ text_run: { content: "long code line..." } }],
        style: { wrap: true },
      });

      expect(result.structuredContent.code.style).toEqual({
        wrap: true,
      });
    });

    it("should build code block with language and wrap", async () => {
      const result = await buildCodeBlock.callback(context, {
        elements: [{ text_run: { content: "def hello():\n    print('Hi')" } }],
        style: { language: 49, wrap: false }, // Python
      });

      expect(result.structuredContent.code.style).toEqual({
        language: 49,
        wrap: false,
      });
    });

    it("should build code block with common languages", async () => {
      const languages = [
        { code: 1, name: "PlainText" },
        { code: 7, name: "Bash" },
        { code: 22, name: "Go" },
        { code: 29, name: "Java" },
        { code: 30, name: "JavaScript" },
        { code: 49, name: "Python" },
        { code: 53, name: "Rust" },
        { code: 56, name: "SQL" },
        { code: 63, name: "TypeScript" },
      ];

      for (const lang of languages) {
        const result = await buildCodeBlock.callback(context, {
          elements: [{ text_run: { content: `// ${lang.name} code` } }],
          style: { language: lang.code },
        });

        expect(result.structuredContent.code.style?.language).toBe(lang.code);
      }
    });

    it("should build code block with multiline content", async () => {
      const code = `function add(a, b) {
  return a + b;
}

console.log(add(1, 2));`;

      const result = await buildCodeBlock.callback(context, {
        elements: [{ text_run: { content: code } }],
        style: { language: 30 }, // JavaScript
      });

      expect(result.structuredContent.code.elements[0].text_run.content).toBe(
        code
      );
    });

    it("should build code block with background color", async () => {
      const result = await buildCodeBlock.callback(context, {
        elements: [{ text_run: { content: "code" } }],
        style: { background_color: "LightGrayBackground", language: 1 },
      });

      expect(result.structuredContent.code.style).toEqual({
        background_color: "LightGrayBackground",
        language: 1,
      });
    });

    it("should return JSON string in content", async () => {
      const result = await buildCodeBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(14);
    });

    it("should not include style when not provided", async () => {
      const result = await buildCodeBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.structuredContent.code).not.toHaveProperty("style");
    });
  });
});
