import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 信息收集按钮颜色类型
 */
export type InformationCollectionColor = "GREEN" | "BLUE" | "RED" | "ORANGE";

/**
 * 信息收集按钮图标类型
 */
export type InformationCollectionIcon = "CHECK" | "STAR" | "HEART" | "THUMBSUP";

/**
 * 信息收集配置内部结构
 * 注意：beforText 是飞书 API 中的 typo，为保持兼容性保留此拼写
 */
interface InformationCollectionConfig {
  afterText: string;
  beforText: string; // 注意：这是飞书 API 中的 typo，保持兼容性
  color: InformationCollectionColor;
  icon: InformationCollectionIcon;
  readType: number;
  selectVal: number;
}

/**
 * 信息收集 Add-ons Record 内部结构
 */
interface InformationCollectionRecord {
  config: InformationCollectionConfig;
}

/**
 * 信息收集 Block Add-ons 结构
 */
interface InformationCollectionAddOns {
  component_id: string;
  component_type_id: string;
  record: string; // JSON 字符串化的 InformationCollectionRecord
}

/**
 * 信息收集 Block 完整输出 Schema
 */
const informationCollectionBlockOutputSchema = {
  block_type: z.literal(40).describe("块类型，信息收集块固定为 40"),
  add_ons: z
    .object({
      component_id: z.string().describe("组件 ID，创建时为空字符串"),
      component_type_id: z
        .string()
        .describe("组件类型 ID，固定为 blk_6358a421bca0001c1ce11f5f"),
      record: z.string().describe("信息收集配置的 JSON 字符串"),
    })
    .describe("信息收集块的附加配置"),
};

/**
 * 构建信息收集 Block 工具
 *
 * 用于构建飞书文档的信息收集块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_nested_blocks 等 API。
 *
 * 信息收集组件用于在文档中创建交互式按钮，常用于确认阅读、收集反馈等场景。
 *
 * @example
 * // 创建一个简单的已读确认按钮
 * beforeText: "标为已读"
 * afterText: "已标记为已读"
 * color: "GREEN"
 * icon: "CHECK"
 */
export const buildInformationCollectionBlock = defineTool({
  name: "build_information_collection_block",
  description: {
    summary:
      "构建飞书文档的信息收集块数据结构。用于创建交互式按钮，常用于确认阅读、收集反馈、点赞等场景。",
    bestFor:
      "创建已读确认按钮、收集用户反馈、文档点赞功能、阅读打卡、简单投票交互",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_nested_blocks）、需要复杂表单收集信息时（请使用其他表单工具）",
  },
  inputSchema: {
    beforeText: z
      .string()
      .optional()
      .describe("按钮点击前显示的文本，默认为 '标为已读'"),
    afterText: z
      .string()
      .optional()
      .describe("按钮点击后显示的文本，默认为 '标为了已读'"),
    color: z
      .enum(["GREEN", "BLUE", "RED", "ORANGE"])
      .optional()
      .describe(
        "按钮颜色。GREEN: 绿色；BLUE: 蓝色；RED: 红色；ORANGE: 橙色。默认为 GREEN。",
      ),
    icon: z
      .enum(["CHECK", "STAR", "HEART", "THUMBSUP"])
      .optional()
      .describe(
        "按钮图标。CHECK: 勾选图标；STAR: 星形图标；HEART: 心形图标；THUMBSUP: 点赞图标。默认为 CHECK。",
      ),
    readType: z
      .number()
      .int()
      .optional()
      .describe("阅读类型，默认为 1"),
    selectVal: z
      .number()
      .int()
      .optional()
      .describe("选择值，默认为 0"),
  },
  outputSchema: informationCollectionBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    // 构建配置对象
    const config: InformationCollectionConfig = {
      afterText: args.afterText ?? "标为了已读",
      beforText: args.beforeText ?? "标为已读", // 注意：beforText 是飞书 API 中的 typo
      color: (args.color ?? "GREEN") as InformationCollectionColor,
      icon: (args.icon ?? "CHECK") as InformationCollectionIcon,
      readType: args.readType ?? 1,
      selectVal: args.selectVal ?? 0,
    };

    // 构建 record 对象并序列化为 JSON 字符串
    const record: InformationCollectionRecord = {
      config,
    };

    const block = {
      block_type: 40 as const,
      add_ons: {
        component_id: "",
        component_type_id: "blk_6358a421bca0001c1ce11f5f",
        record: JSON.stringify(record),
      } satisfies InformationCollectionAddOns,
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
