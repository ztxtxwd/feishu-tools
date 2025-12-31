import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 目录导航视图类型
 */
export type CatalogNavigationViewType = "normal" | "card";

/**
 * Catalog Navigation Add-ons Record 内部结构
 */
interface CatalogNavigationRecord {
  ignoreCataLogRecordIds: string[];
  isShowAllLevel: boolean;
  showCataLogLevel: number;
  viewType: CatalogNavigationViewType;
}

/**
 * Catalog Navigation Block Add-ons 结构
 */
interface CatalogNavigationAddOns {
  component_id: string;
  component_type_id: string;
  record: string; // JSON 字符串化的 CatalogNavigationRecord
}

/**
 * Catalog Navigation Block 完整输出 Schema
 */
const catalogNavigationBlockOutputSchema = {
  block_type: z.literal(40).describe("块类型，目录导航块固定为 40"),
  add_ons: z
    .object({
      component_id: z.string().describe("组件 ID，创建时为空字符串"),
      component_type_id: z
        .string()
        .describe("组件类型 ID，固定为 blk_637dcc698597401c1a8fd711"),
      record: z.string().describe("目录导航配置的 JSON 字符串"),
    })
    .describe("目录导航块的附加配置"),
};

/**
 * 构建目录导航 Block 工具
 *
 * 用于构建飞书文档的目录导航块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_nested_blocks 等 API。
 *
 * 目录导航组件用于在文档中创建目录大纲，方便读者快速导航到文档的各个章节。
 *
 * @example
 * // 创建一个默认的目录导航块
 * {}
 *
 * @example
 * // 创建一个卡片视图的目录导航块，显示 2 级目录
 * {
 *   viewType: "card",
 *   showCatalogLevel: 2,
 *   isShowAllLevel: false
 * }
 */
export const buildCatalogNavigationBlock = defineTool({
  name: "build_catalog_navigation_block",
  description: {
    summary:
      "构建飞书文档的目录导航块数据结构。用于创建文档目录大纲，帮助读者快速导航到文档的各个章节。支持普通视图和卡片视图两种展示方式。",
    bestFor:
      "创建长文档的目录导航、技术文档的章节索引、知识库文档的内容概览、产品说明书的目录",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_nested_blocks）、短文档不需要目录导航、动态内容的导航",
  },
  inputSchema: {
    viewType: z
      .enum(["normal", "card"])
      .optional()
      .describe(
        "视图类型。normal: 普通视图（默认）；card: 卡片视图，以卡片形式展示目录项。",
      ),
    showCatalogLevel: z
      .number()
      .int()
      .min(1)
      .max(6)
      .optional()
      .describe("显示目录层级，范围 1-6，默认为 3。表示显示几级标题作为目录项。"),
    isShowAllLevel: z
      .boolean()
      .optional()
      .describe("是否显示所有层级，默认为 true。设为 false 时仅显示 showCatalogLevel 指定的层级。"),
    ignoreCatalogRecordIds: z
      .array(z.string())
      .optional()
      .describe("忽略的目录记录 ID 数组，这些标题将不会出现在目录导航中。默认为空数组。"),
  },
  outputSchema: catalogNavigationBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const viewType: CatalogNavigationViewType =
      (args.viewType as CatalogNavigationViewType) ?? "normal";
    const showCataLogLevel = args.showCatalogLevel ?? 3;
    const isShowAllLevel = args.isShowAllLevel ?? true;
    const ignoreCataLogRecordIds = args.ignoreCatalogRecordIds ?? [];

    // 构建 record 对象并序列化为 JSON 字符串
    const record: CatalogNavigationRecord = {
      ignoreCataLogRecordIds,
      isShowAllLevel,
      showCataLogLevel,
      viewType,
    };

    const block = {
      block_type: 40 as const,
      add_ons: {
        component_id: "",
        component_type_id: "blk_637dcc698597401c1a8fd711",
        record: JSON.stringify(record),
      } satisfies CatalogNavigationAddOns,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(block, null, 2),
        },
      ],
      structuredContent: block,
    };
  },
});
