import { describe, it, expect } from "vitest";
import { buildEquationBlock } from "../../../../../src/tools/docx/blocks/build-equation-block.js";

describe("buildEquationBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildEquationBlock.name).toBe("build_equation_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildEquationBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description mentioning KaTeX", () => {
      expect(buildEquationBlock.description).toBeDefined();
      const desc = buildEquationBlock.description;
      if (typeof desc === "object" && "summary" in desc) {
        expect(desc.summary).toContain("KaTeX");
      }
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build equation block with correct block_type", async () => {
      const result = await buildEquationBlock.callback(context, {
        elements: [{ equation: { content: "E = mc^2" } }],
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 16,
        equation: {
          elements: [{ equation: { content: "E = mc^2" } }],
        },
      });
    });

    it("should build equation block with complex KaTeX formula", async () => {
      const result = await buildEquationBlock.callback(context, {
        elements: [
          { equation: { content: "\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)" } },
        ],
      });

      expect(result.structuredContent).toEqual({
        block_type: 16,
        equation: {
          elements: [
            {
              equation: { content: "\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)" },
            },
          ],
        },
      });
    });

    it("should build equation block with style", async () => {
      const result = await buildEquationBlock.callback(context, {
        elements: [{ equation: { content: "a^2 + b^2 = c^2" } }],
        style: { align: 2 },
      });

      expect(result.structuredContent).toEqual({
        block_type: 16,
        equation: {
          elements: [{ equation: { content: "a^2 + b^2 = c^2" } }],
          style: { align: 2 },
        },
      });
    });

    it("should build equation block with background color", async () => {
      const result = await buildEquationBlock.callback(context, {
        elements: [{ equation: { content: "\\frac{a}{b}" } }],
        style: { background_color: "LightBlueBackground" },
      });

      expect(result.structuredContent.equation.style).toEqual({
        background_color: "LightBlueBackground",
      });
    });

    it("should build equation block with mixed elements", async () => {
      const result = await buildEquationBlock.callback(context, {
        elements: [
          { text_run: { content: "The formula is: " } },
          { equation: { content: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}" } },
        ],
      });

      expect(result.structuredContent.equation.elements).toHaveLength(2);
    });

    it("should return JSON string in content", async () => {
      const result = await buildEquationBlock.callback(context, {
        elements: [{ equation: { content: "\\pi" } }],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(16);
    });

    it("should not include style when not provided", async () => {
      const result = await buildEquationBlock.callback(context, {
        elements: [{ equation: { content: "\\sum_{i=1}^{n} i" } }],
      });

      expect(result.structuredContent.equation).not.toHaveProperty("style");
    });
  });
});
