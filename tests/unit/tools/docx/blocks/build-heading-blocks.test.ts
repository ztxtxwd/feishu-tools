import { describe, it, expect } from "vitest";
import {
  buildHeading1Block,
  buildHeading2Block,
  buildHeading3Block,
  buildHeading4Block,
  buildHeading5Block,
  buildHeading6Block,
  buildHeading7Block,
  buildHeading8Block,
  buildHeading9Block,
} from "../../../../../src/tools/docx/blocks/build-heading-blocks.js";

/**
 * 测试工厂函数：为每个 heading 级别生成测试
 */
function createHeadingTests(
  blockName: string,
  blockType: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildFn: any
) {
  describe(`build${blockName}Block`, () => {
    describe("tool definition", () => {
      it("should have correct name", () => {
        expect(buildFn.name).toBe(`build_${blockName.toLowerCase()}_block`);
      });

      it("should have readOnlyHint annotation", () => {
        expect(buildFn.annotations?.readOnlyHint).toBe(true);
      });

      it("should have description", () => {
        expect(buildFn.description).toBeDefined();
      });
    });

    describe("callback", () => {
      const context = {};

      it("should build block with correct block_type", async () => {
        const result = await buildFn.callback(context, {
          elements: [{ text_run: { content: "Test heading" } }],
        });

        expect(result.isError).toBeUndefined();
        expect(result.structuredContent.block_type).toBe(blockType);
      });

      it("should build block with correct content field name", async () => {
        const result = await buildFn.callback(context, {
          elements: [{ text_run: { content: "Test heading" } }],
        });

        expect(
          result.structuredContent[blockName.toLowerCase()]
        ).toBeDefined();
        expect(
          result.structuredContent[blockName.toLowerCase()].elements
        ).toEqual([{ text_run: { content: "Test heading" } }]);
      });

      it("should build block with style", async () => {
        const result = await buildFn.callback(context, {
          elements: [{ text_run: { content: "Styled heading" } }],
          style: { align: 2, folded: true },
        });

        expect(
          result.structuredContent[blockName.toLowerCase()].style
        ).toEqual({
          align: 2,
          folded: true,
        });
      });

      it("should build block with rich text elements", async () => {
        const result = await buildFn.callback(context, {
          elements: [
            { text_run: { content: "Normal " } },
            {
              text_run: {
                content: "bold",
                text_element_style: { bold: true },
              },
            },
          ],
        });

        expect(
          result.structuredContent[blockName.toLowerCase()].elements
        ).toHaveLength(2);
      });

      it("should return JSON string in content", async () => {
        const result = await buildFn.callback(context, {
          elements: [{ text_run: { content: "test" } }],
        });

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe("text");
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.block_type).toBe(blockType);
      });

      it("should not include style when not provided", async () => {
        const result = await buildFn.callback(context, {
          elements: [{ text_run: { content: "test" } }],
        });

        expect(
          result.structuredContent[blockName.toLowerCase()]
        ).not.toHaveProperty("style");
      });
    });
  });
}

// 为每个 heading 级别生成测试
createHeadingTests("Heading1", 3, buildHeading1Block);
createHeadingTests("Heading2", 4, buildHeading2Block);
createHeadingTests("Heading3", 5, buildHeading3Block);
createHeadingTests("Heading4", 6, buildHeading4Block);
createHeadingTests("Heading5", 7, buildHeading5Block);
createHeadingTests("Heading6", 8, buildHeading6Block);
createHeadingTests("Heading7", 9, buildHeading7Block);
createHeadingTests("Heading8", 10, buildHeading8Block);
createHeadingTests("Heading9", 11, buildHeading9Block);
