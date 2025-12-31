import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 时间轴布局模式
 */
export type TimelineMode =
  | "horizontal_alternating"
  | "horizontal"
  | "vertical";

/**
 * 时间轴项目
 */
export interface TimelineItem {
  id: string;
  title: string;
  time: string;
  text: string;
}

/**
 * 时间轴内容显示配置
 */
interface TimelineContentShow {
  title: boolean;
  time: boolean;
  text: boolean;
}

/**
 * Timeline Add-ons Record 内部结构
 */
interface TimelineRecord {
  blockId: string;
  contentShow: TimelineContentShow;
  items: TimelineItem[];
  mode: TimelineMode;
}

/**
 * Timeline Block Add-ons 结构
 */
interface TimelineAddOns {
  component_id: string;
  component_type_id: string;
  record: string; // JSON 字符串化的 TimelineRecord
}

/**
 * Timeline Block 完整输出 Schema
 */
const timelineBlockOutputSchema = {
  block_type: z.literal(40).describe("块类型，时间轴块固定为 40"),
  add_ons: z
    .object({
      component_id: z.string().describe("组件 ID，创建时为空字符串"),
      component_type_id: z
        .string()
        .describe("组件类型 ID，固定为 blk_6358a421bca0001c22536e4c"),
      record: z.string().describe("时间轴配置的 JSON 字符串"),
    })
    .describe("时间轴块的附加配置"),
};

/**
 * 时间轴项目输入 Schema
 */
const timelineItemSchema = z.object({
  title: z.string().min(1).describe("标题，必填"),
  time: z.string().min(1).describe("时间，必填"),
  text: z.string().optional().describe("描述文本，可选"),
});

/**
 * 内容显示配置 Schema
 */
const contentShowSchema = z
  .object({
    title: z.boolean().optional().describe("是否显示标题，默认为 true"),
    time: z.boolean().optional().describe("是否显示时间，默认为 true"),
    text: z.boolean().optional().describe("是否显示描述文本，默认为 true"),
  })
  .optional();

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 构建时间轴 Block 工具
 *
 * 用于构建飞书文档的时间轴块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_nested_blocks 等 API。
 *
 * 时间轴组件用于在文档中展示时间线、里程碑、事件进程等信息，
 * 适合项目规划、历史事件、产品路线图等场景。
 *
 * @example
 * // 创建一个简单的时间轴
 * items: [
 *   { title: "项目启动", time: "2024-01-01", text: "项目正式启动" },
 *   { title: "第一阶段完成", time: "2024-03-01", text: "完成基础功能开发" },
 *   { title: "正式上线", time: "2024-06-01", text: "产品正式发布" }
 * ]
 */
export const buildTimelineBlock = defineTool({
  name: "build_timeline_block",
  description: {
    summary:
      "构建飞书文档的时间轴块数据结构。用于展示时间线、里程碑、事件进程等信息，每个节点包含标题、时间和可选的描述文本。",
    bestFor:
      "创建项目规划时间线、产品路线图、历史事件展示、里程碑记录、版本发布计划",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_nested_blocks）、需要复杂交互的时间线（时间轴仅支持静态展示）",
  },
  inputSchema: {
    items: z
      .array(timelineItemSchema)
      .min(1)
      .describe(
        "时间轴项目列表，每个项目包含 title（标题）、time（时间）和可选的 text（描述）",
      ),
    mode: z
      .enum(["horizontal_alternating", "horizontal", "vertical"])
      .optional()
      .describe(
        "时间轴布局模式。horizontal_alternating: 水平交替（默认）；horizontal: 水平；vertical: 垂直",
      ),
    contentShow: contentShowSchema.describe(
      "内容显示配置，控制标题、时间、描述的显示与隐藏",
    ),
  },
  outputSchema: timelineBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const mode: TimelineMode = args.mode ?? "horizontal_alternating";

    // 构建内容显示配置，合并默认值
    const contentShow: TimelineContentShow = {
      title: args.contentShow?.title ?? true,
      time: args.contentShow?.time ?? true,
      text: args.contentShow?.text ?? true,
    };

    // 生成 blockId
    const blockId = generateId();

    // 转换时间轴项目格式，为每个项目生成唯一 ID
    const items: TimelineItem[] = args.items.map((item) => ({
      id: generateId(),
      title: item.title,
      time: item.time,
      text: item.text ?? "",
    }));

    // 构建 record 对象并序列化为 JSON 字符串
    const record: TimelineRecord = {
      blockId,
      contentShow,
      items,
      mode,
    };

    const block = {
      block_type: 40 as const,
      add_ons: {
        component_id: "",
        component_type_id: "blk_6358a421bca0001c22536e4c",
        record: JSON.stringify(record),
      } satisfies TimelineAddOns,
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
