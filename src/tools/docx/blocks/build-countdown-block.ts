import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 倒计时类型
 * 0: 持续时间模式（倒计时 N 天 N 小时 N 分 N 秒）
 * 1: 目标日期时间模式（倒计时到指定日期时间）
 */
type TimingType = 0 | 1;

/**
 * 目标日期时间模式的 settingData
 */
interface TargetDateTimeSettingData {
  date: string; // "2026-01-01"
  time: string; // "11:24"
}

/**
 * 持续时间模式的 settingData
 */
interface DurationSettingData {
  d: string; // 天
  h: string; // 小时
  m: string; // 分钟
  s: string; // 秒
  date: string; // 创建时的日期
  time: string; // 创建时的时间
}

/**
 * Countdown Add-ons Record 内部结构
 */
interface CountdownRecord {
  color: string; // 十六进制颜色，如 "#FF8800"
  duration: number; // 剩余时间（秒）
  isNotify: boolean; // 是否开启通知
  settingData: TargetDateTimeSettingData | DurationSettingData;
  startTime: number; // 开始时间戳（毫秒）
  timingType: TimingType;
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

// 颜色映射：友好名称 -> 十六进制
const COLOR_MAP: Record<string, string> = {
  BLUE: "#3370FF",
  GREEN: "#34C724",
  RED: "#F54A45",
  ORANGE: "#FF8800",
  PURPLE: "#7B67EE",
};

/**
 * 解析颜色参数，支持友好名称或十六进制
 */
function resolveColor(color: string | undefined): string {
  if (!color) return COLOR_MAP.ORANGE; // 默认橙色
  // 如果是十六进制格式，直接返回
  if (color.startsWith("#")) return color.toUpperCase();
  // 否则从映射表查找
  return COLOR_MAP[color.toUpperCase()] ?? COLOR_MAP.ORANGE;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间为 HH:mm
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * 构建倒计时 Block 工具
 *
 * 用于构建飞书文档的倒计时块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_nested_blocks 等 API。
 *
 * 支持两种创建方式：
 * 1. 目标日期时间模式：指定一个结束日期时间
 * 2. 持续时间模式：指定倒计时的天/时/分/秒
 *
 * @example
 * // 方式1: 倒计时到 2026 年元旦
 * { targetDateTime: "2026-01-01 00:00" }
 *
 * // 方式2: 倒计时 7 天
 * { days: 7 }
 */
export const buildCountdownBlock = defineTool({
  name: "build_countdown_block",
  description: {
    summary:
      "构建飞书文档的倒计时块数据结构。支持两种模式：目标日期时间模式（倒计时到指定时间）或持续时间模式（倒计时 N 天 N 小时等）。",
    bestFor:
      "项目截止日期倒计时、活动开始倒计时、里程碑提醒、限时优惠倒计时、会议开始倒计时",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_nested_blocks）、需要精确到秒级动态更新的实时计时器",
  },
  inputSchema: {
    targetDateTime: z
      .string()
      .optional()
      .describe(
        "目标日期时间，格式 'YYYY-MM-DD HH:mm'，如 '2026-01-01 00:00'。与 days/hours/minutes/seconds 二选一。",
      ),
    days: z.number().int().min(0).optional().describe("倒计时天数，默认 0"),
    hours: z.number().int().min(0).max(23).optional().describe("倒计时小时数，默认 0"),
    minutes: z
      .number()
      .int()
      .min(0)
      .max(59)
      .optional()
      .describe("倒计时分钟数，默认 0"),
    seconds: z
      .number()
      .int()
      .min(0)
      .max(59)
      .optional()
      .describe("倒计时秒数，默认 0"),
    color: z
      .string()
      .optional()
      .describe(
        "颜色，支持名称（BLUE/GREEN/RED/ORANGE/PURPLE）或十六进制（如 #FF8800）。默认 ORANGE。",
      ),
    notify: z.boolean().optional().describe("是否开启倒计时结束通知，默认 true"),
  },
  outputSchema: countdownBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const color = resolveColor(args.color);
    const isNotify = args.notify ?? true;
    const now = new Date();
    const startTime = now.getTime();

    let record: CountdownRecord;

    if (args.targetDateTime) {
      // 目标日期时间模式 (timingType: 1)
      const [datePart, timePart] = args.targetDateTime.split(" ");
      if (!datePart || !timePart) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: targetDateTime 格式错误，应为 'YYYY-MM-DD HH:mm'",
            },
          ],
          isError: true,
        };
      }

      const targetDate = new Date(args.targetDateTime.replace(" ", "T"));
      if (isNaN(targetDate.getTime())) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: targetDateTime 解析失败，请检查格式",
            },
          ],
          isError: true,
        };
      }

      const durationSeconds = Math.max(0, (targetDate.getTime() - startTime) / 1000);

      record = {
        color,
        duration: durationSeconds,
        isNotify,
        settingData: {
          date: datePart,
          time: timePart,
        },
        startTime,
        timingType: 1,
      };
    } else {
      // 持续时间模式 (timingType: 0)
      const d = args.days ?? 0;
      const h = args.hours ?? 0;
      const m = args.minutes ?? 0;
      const s = args.seconds ?? 0;

      const durationSeconds = d * 86400 + h * 3600 + m * 60 + s;

      if (durationSeconds <= 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: 请指定 targetDateTime 或至少一个 days/hours/minutes/seconds 参数",
            },
          ],
          isError: true,
        };
      }

      record = {
        color,
        duration: durationSeconds,
        isNotify,
        settingData: {
          d: String(d),
          h: String(h),
          m: String(m),
          s: String(s),
          date: formatDate(now),
          time: formatTime(now),
        },
        startTime,
        timingType: 0,
      };
    }

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
