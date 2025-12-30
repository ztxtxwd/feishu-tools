import { describe, it, expect } from "vitest";
import { buildGridBlock } from "../../../../../src/tools/docx/blocks/build-grid-block.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

describe("buildGridBlock", () => {
  const context = {};
  const extra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildGridBlock.name).toBe("build_grid_block");
    });

    it("should have description", () => {
      expect(buildGridBlock.description).toBeDefined();
    });

    it("should have inputSchema", () => {
      expect(buildGridBlock.inputSchema).toBeDefined();
    });

    it("should have outputSchema", () => {
      expect(buildGridBlock.outputSchema).toBeDefined();
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildGridBlock.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe("default width distribution", () => {
    it("should create 2-column grid with 50/50 ratio", async () => {
      const result = await buildGridBlock.callback(context, { column_size: 2 }, extra);

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        grid: {
          block_type: 24,
          grid: {
            column_size: 2,
          },
        },
        columns: [
          {
            block_type: 25,
            grid_column: {
              width_ratio: 50,
            },
          },
          {
            block_type: 25,
            grid_column: {
              width_ratio: 50,
            },
          },
        ],
      });
    });

    it("should create 3-column grid with 33/33/34 ratio", async () => {
      const result = await buildGridBlock.callback(context, { column_size: 3 }, extra);

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        grid: {
          block_type: 24,
          grid: {
            column_size: 3,
          },
        },
        columns: [
          { block_type: 25, grid_column: { width_ratio: 33 } },
          { block_type: 25, grid_column: { width_ratio: 33 } },
          { block_type: 25, grid_column: { width_ratio: 34 } },
        ],
      });
    });

    it("should create 4-column grid with equal distribution", async () => {
      const result = await buildGridBlock.callback(context, { column_size: 4 }, extra);

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        grid: {
          block_type: 24,
          grid: {
            column_size: 4,
          },
        },
        columns: [
          { block_type: 25, grid_column: { width_ratio: 25 } },
          { block_type: 25, grid_column: { width_ratio: 25 } },
          { block_type: 25, grid_column: { width_ratio: 25 } },
          { block_type: 25, grid_column: { width_ratio: 25 } },
        ],
      });
    });

    it("should create 5-column grid with equal distribution", async () => {
      const result = await buildGridBlock.callback(context, { column_size: 5 }, extra);

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        grid: {
          block_type: 24,
          grid: {
            column_size: 5,
          },
        },
        columns: [
          { block_type: 25, grid_column: { width_ratio: 20 } },
          { block_type: 25, grid_column: { width_ratio: 20 } },
          { block_type: 25, grid_column: { width_ratio: 20 } },
          { block_type: 25, grid_column: { width_ratio: 20 } },
          { block_type: 25, grid_column: { width_ratio: 20 } },
        ],
      });
    });
  });

  describe("custom width ratios", () => {
    it("should create grid with custom width ratios", async () => {
      const result = await buildGridBlock.callback(
        context,
        {
          column_size: 2,
          width_ratios: [30, 70],
        },
        extra
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        grid: {
          block_type: 24,
          grid: {
            column_size: 2,
          },
        },
        columns: [
          { block_type: 25, grid_column: { width_ratio: 30 } },
          { block_type: 25, grid_column: { width_ratio: 70 } },
        ],
      });
    });

    it("should create 3-column grid with custom ratios", async () => {
      const result = await buildGridBlock.callback(
        context,
        {
          column_size: 3,
          width_ratios: [20, 50, 30],
        },
        extra
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        grid: {
          block_type: 24,
          grid: {
            column_size: 3,
          },
        },
        columns: [
          { block_type: 25, grid_column: { width_ratio: 20 } },
          { block_type: 25, grid_column: { width_ratio: 50 } },
          { block_type: 25, grid_column: { width_ratio: 30 } },
        ],
      });
    });
  });

  describe("validation errors", () => {
    it("should return error when width_ratios length does not match column_size", async () => {
      const result = await buildGridBlock.callback(
        context,
        {
          column_size: 3,
          width_ratios: [50, 50], // Wrong length
        },
        extra
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.type).toBe("text");
      if (result.content[0]?.type === "text") {
        expect(result.content[0].text).toContain(
          "width_ratios 数组长度 (2) 必须等于 column_size (3)"
        );
      }
    });

    it("should return error when width_ratios sum is not 100", async () => {
      const result = await buildGridBlock.callback(
        context,
        {
          column_size: 2,
          width_ratios: [40, 40], // Sum is 80, not 100
        },
        extra
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.type).toBe("text");
      if (result.content[0]?.type === "text") {
        expect(result.content[0].text).toContain(
          "width_ratios 总和 (80) 必须等于 100"
        );
      }
    });
  });

  describe("output format", () => {
    it("should return formatted JSON string in content", async () => {
      const result = await buildGridBlock.callback(context, { column_size: 2, width_ratios: undefined }, extra);

      expect(result.content[0]?.type).toBe("text");
      if (result.content[0]?.type === "text") {
        expect(result.content[0].text).toContain('"block_type": 24');
        expect(result.content[0].text).toContain('"column_size": 2');
      }
    });

    it("should return structuredContent", async () => {
      const result = await buildGridBlock.callback(context, { column_size: 2, width_ratios: undefined }, extra);

      expect(result.structuredContent).toBeDefined();
      const structured = result.structuredContent as {
        grid: { block_type: number };
        columns: unknown[];
      };
      expect(structured.grid.block_type).toBe(24);
      expect(structured.columns).toHaveLength(2);
    });
  });
});
