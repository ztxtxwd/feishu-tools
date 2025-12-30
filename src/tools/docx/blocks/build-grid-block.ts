import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * Grid Block 输入 Schema
 */
const gridBlockInputSchema = {
  column_size: z
    .number()
    .int()
    .min(2)
    .max(5)
    .describe("分栏数量，支持 2-5 列"),
  width_ratios: z
    .array(z.number().int().min(1).max(100))
    .optional()
    .describe(
      "每列的宽度比例（百分比），数组长度必须等于列数，所有值总和应为 100。如果不提供，将平均分配宽度"
    ),
};

/**
 * Grid Column 输出 Schema
 */
const gridColumnSchema = z.object({
  block_type: z.literal(25).describe("块类型，Grid Column 块固定为 25"),
  grid_column: z
    .object({
      width_ratio: z.number().describe("列宽度比例（百分比）"),
    })
    .describe("分栏列内容"),
});

/**
 * Grid Block 输出 Schema
 */
const gridBlockOutputSchema = {
  grid: z
    .object({
      block_type: z.literal(24).describe("块类型，Grid 块固定为 24"),
      grid: z
        .object({
          column_size: z.number().describe("分栏数量"),
        })
        .describe("分栏块内容"),
    })
    .describe("Grid 块数据"),
  columns: z.array(gridColumnSchema).describe("所有 Grid Column 块数据"),
};

/**
 * 计算平均分配的宽度比例
 * @param columnSize 列数
 * @returns 宽度比例数组
 */
function calculateDefaultWidthRatios(columnSize: number): number[] {
  const baseWidth = Math.floor(100 / columnSize);
  const remainder = 100 - baseWidth * columnSize;

  // 创建基础数组
  const ratios = Array(columnSize).fill(baseWidth);

  // 将余数分配给最后一列
  if (remainder > 0) {
    ratios[columnSize - 1] += remainder;
  }

  return ratios;
}

/**
 * 构建 Grid Block 工具
 *
 * 用于构建飞书文档的分栏（Grid）块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_block 等 API。
 *
 * Grid 块是一个容器块，包含多个 grid_column 子块。
 * 由于 grid 和 grid_column 在构建之初就绑定在一起，
 * 因此这个工具的产物将是 grid block + grid_column blocks 的数据结构。
 */
export const buildGridBlock = defineTool({
  name: "build_grid_block",
  description: {
    summary:
      "构建飞书文档的分栏（Grid）块数据结构。分栏块用于创建多列布局，支持 2-5 列，可自定义每列的宽度比例。",
    bestFor: "创建多列布局、并排显示内容、对比信息展示、复杂页面排版",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_block）、添加列内容时（需单独调用 create_block）",
  },
  inputSchema: gridBlockInputSchema,
  outputSchema: gridBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const { column_size, width_ratios } = args;

    // 验证 width_ratios 数组长度是否等于 column_size
    if (width_ratios !== undefined) {
      if (width_ratios.length !== column_size) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: width_ratios 数组长度 (${width_ratios.length}) 必须等于 column_size (${column_size})`,
            },
          ],
          isError: true,
        };
      }

      // 验证 width_ratios 总和是否为 100
      const sum = width_ratios.reduce((acc, val) => acc + val, 0);
      if (sum !== 100) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: width_ratios 总和 (${sum}) 必须等于 100`,
            },
          ],
          isError: true,
        };
      }
    }

    // 使用提供的 width_ratios 或计算默认值
    const ratios = width_ratios ?? calculateDefaultWidthRatios(column_size);

    // 构建 Grid 块
    const grid = {
      block_type: 24 as const,
      grid: {
        column_size,
      },
    };

    // 构建 Grid Column 块数组
    const columns = ratios.map((width_ratio) => ({
      block_type: 25 as const,
      grid_column: {
        width_ratio,
      },
    }));

    const result = {
      grid,
      columns,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
      structuredContent: result,
    };
  },
});
