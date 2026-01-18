import { z } from "zod";
import { defineTool } from "../../../define-tool.js";
import { cleanParams } from "../../../utils/clean-params.js";
import { resolveToken } from "../../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 创建块工具（支持单个或嵌套块）
 *
 * 这是创建飞书文档块的统一接口，既可以创建单个块，也可以创建有父子关系的嵌套块结构。
 * 对于 AI 来说，只需要使用这一个工具即可完成所有块的创建操作。
 *
 * ## 使用 build 工具产物的指南
 *
 * 当使用 build_grid_block、build_iframe_block 等 build 工具时，需要将产物转换为本工具的格式：
 *
 * 1. **生成临时 ID**：为每个块分配唯一的临时 ID（如 "grid_1", "col_1", "text_1"）
 * 2. **拆平嵌套结构**：将 build 工具返回的嵌套对象拆平到 descendants 数组中
 * 3. **添加 children 字段**：为每个有子块的块添加 children 数组，包含子块的 ID
 * 4. **添加 block_id**：每个块必须包含 block_id 字段（使用步骤 1 生成的临时 ID）
 *
 * 例如，build_grid_block 返回 { grid: {...}, columns: [...] }，需要转换为：
 * - children_id: ["grid_1"]
 * - descendants: [
 *     { block_id: "grid_1", ...grid, children: ["col_1", "col_2"] },
 *     { block_id: "col_1", ...columns[0], children: [...] },
 *     { block_id: "col_2", ...columns[1], children: [...] }
 *   ]
 */
export const createBlocks = defineTool({
  name: "create_blocks",
  description: {
    summary:
      "在飞书文档中创建块。支持创建单个块（如文本、标题、列表等）或嵌套块结构（如分栏布局、带内容的 Callout、多层列表等）。这是创建任何类型块的统一工具。",
    bestFor:
      "创建任何类型的块，包括：文本、标题、列表、代码块、引用块、分栏布局、Callout 块、嵌套列表等。无论是单个块还是复杂的嵌套结构，都使用这个工具。",
    notRecommendedFor:
      "修改已有的块（请使用 update_block）、删除块（请使用 delete_block）",
    usageGuide:
      "当使用 build_*_block 工具时，需要转换其产物：1) 为所有块生成临时 ID；2) 将嵌套结构拆平到 descendants 数组；3) 为父块添加 children 字段引用子块 ID；4) 将顶层块 ID 放入 children_id 数组。例如：build_grid_block 的 { grid, columns } 需转换为包含 grid 和所有 columns 的扁平 descendants 数组。",
  },
  inputSchema: {
    document_id: z.string().describe("文档的唯一标识"),
    block_id: z
      .string()
      .optional()
      .describe("父块ID，如果不传则添加到文档末尾"),
    index: z
      .number()
      .int()
      .optional()
      .describe(
        "插入位置，从 0 开始。如果不指定，则添加到父块的末尾。如果指定了父块，则表示在父块的第 index 个子块之后插入"
      ),
    children_id: z
      .array(z.string())
      .min(1)
      .max(1000)
      .describe(
        "顶层块 ID 列表（自定义的块 ID，用于在 descendants 中引用）。这些块将直接添加到父块下"
      ),
    descendants: z
      .array(z.any())
      .describe(
        "所有块的扁平数组（包括顶层块和所有子孙块）。每个块必须包含：block_id（自定义ID），block_type（块类型），children（子块ID数组，可选），以及块特定的内容字段（如 text, grid, grid_column 等）"
      ),
    document_revision_id: z
      .number()
      .int()
      .optional()
      .describe(
        "文档版本 ID。用于版本冲突检测。如果传入的版本号不是最新版本，接口将返回失败。不传则不做版本冲突检测"
      ),
    client_token: z
      .string()
      .optional()
      .describe(
        "操作的唯一标识，用于幂等性校验。传入相同的 client_token 会返回相同的结果"
      ),
  },
  annotations: {
    title: "创建块",
  },
  callback: async (context, args) => {
    if (!context.client) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Feishu client is required for this operation",
          },
        ],
        isError: true,
      };
    }

    const {
      document_id,
      block_id,
      index,
      children_id,
      descendants,
      document_revision_id,
      client_token,
    } = args;

    try {
      // 解析 User Access Token（如果提供）
      const userAccessToken = await resolveToken(context.getUserAccessToken);
      const requestOptions = userAccessToken
        ? lark.withUserAccessToken(userAccessToken)
        : undefined;

      // 调用创建嵌套块 API
      const result = await context.client.docx.v1.documentBlockDescendant.create(
        {
          path: {
            document_id,
            block_id: block_id || document_id, // 如果没有指定父块，使用文档ID作为父块
          },
          params: cleanParams({
            document_revision_id,
            client_token,
          }),
          data: {
            children_id,
            index,
            descendants,
          },
        },
        requestOptions
      );

      if (result.code !== 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Failed to create blocks\nCode: ${result.code}\nMessage: ${result.msg}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
});
