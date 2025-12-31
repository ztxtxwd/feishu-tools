import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 倒计时颜色主题
 */
export type CountdownColor = "BLUE" | "GREEN" | "RED" | "ORANGE" | "PURPLE";

/**
 * Countdown Add-ons Record 内部结构
 */
interface CountdownRecord {
  color: CountdownColor;
  duration: number;
  startTime: number;
}

/**
 * Countdown Block Add-ons 结构
 */
interface CountdownAddOns {
  component_id: string;
  component_type_id: string;
  record: string; // JSON 字符串化的 CountdownRecord
}

/**
 * Countdown Block 完整输出 Schema
 */
const countdownBlockOutputSchema = {
  block_type: z.literal(40).describe("块类型，倒计时块固定为 40"),
  add_ons: z
    .object({
      component_id: z.string().describe("组件 ID，创建时为空字符串"),
      component_type_id: z
        .string()
        .describe("组件类型 ID，固定为 blk_6358a421bca0001c1ce10709"),
      record: z.string().describe("倒计时配置的 JSON 字符串"),
    })
    .describe("倒计时块的附加配置"),
};

/**
 * 构建倒计时 Block 工具
 *
 * 用于构建飞书文档的倒计时块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_nested_blocks 等 API。
 *
 * 倒计时组件用于在文档中显示距离某个时间点的倒计时，适合项目截止日期、活动倒计时等场景。
 *
 * @example
 * // 创建一个 7 天的倒计时（从现在开始）
 * startTime: Date.now(),
 * duration: 7 * 24 * 60 * 60 * 1000,  // 7 天，单位毫秒
 * color: "BLUE"
 */
export const buildCountdownBlock = defineTool({
  name: "build_countdown_block",
  description: {
    summary:
      "构建飞书文档的倒计时块数据结构。用于显示距离某个时间点的倒计时，支持多种颜色主题。",
    bestFor:
      "项目截止日期倒计时、活动开始倒计时、里程碑提醒、限时优惠倒计时、会议开始倒计时",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_nested_blocks）、需要精确到秒级动态更新的实时计时器",
  },
  inputSchema: {
    startTime: z
      .number()
      .int()
      .positive()
      .describe("开始时间戳，毫秒。倒计时结束时间 = startTime + duration"),
    duration: z
      .number()
      .int()
      .positive()
      .describe("倒计时持续时间，毫秒。例如：7天 = 7 * 24 * 60 * 60 * 1000 = 604800000"),
    color: z
      .enum(["BLUE", "GREEN", "RED", "ORANGE", "PURPLE"])
      .optional()
      .describe(
        "颜色主题。BLUE: 蓝色（默认）；GREEN: 绿色；RED: 红色；ORANGE: 橙色；PURPLE: 紫色。",
      ),
  },
  outputSchema: countdownBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const color: CountdownColor = (args.color ?? "BLUE") as CountdownColor;

    // 构建 record 对象并序列化为 JSON 字符串
    const record: CountdownRecord = {
      color,
      duration: args.duration,
      startTime: args.startTime,
    };

    const block = {
      block_type: 40 as const,
      add_ons: {
        component_id: "",
        component_type_id: "blk_6358a421bca0001c1ce10709",
        record: JSON.stringify(record),
      } satisfies CountdownAddOns,
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
