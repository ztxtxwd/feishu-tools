import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * Mermaid 主题类型
 */
export type MermaidTheme = "default" | "dark" | "forest" | "neutral";

/**
 * Mermaid Add-ons Record 内部结构
 */
interface MermaidRecord {
  data: string;
  theme: MermaidTheme;
  view: string;
}

/**
 * Mermaid Block Add-ons 结构
 */
interface MermaidAddOns {
  component_id: string;
  component_type_id: string;
  record: string; // JSON 字符串化的 MermaidRecord
}

/**
 * Mermaid Block 完整输出 Schema
 */
const mermaidBlockOutputSchema = {
  block_type: z.literal(40).describe("块类型，Mermaid 绘图块固定为 40"),
  add_ons: z
    .object({
      component_id: z.string().describe("组件 ID，创建时为空字符串"),
      component_type_id: z
        .string()
        .describe("组件类型 ID，固定为 blk_631fefbbae02400430b8f9f4"),
      record: z.string().describe("Mermaid 配置的 JSON 字符串"),
    })
    .describe("Mermaid 块的附加配置"),
};

/**
 * 构建 Mermaid Block 工具
 *
 * 用于构建飞书文档的 Mermaid 文本绘图块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_nested_blocks 等 API。
 *
 * Mermaid 是一种基于文本的绘图语法，支持流程图、序列图、甘特图、类图等多种图表类型。
 *
 * @example
 * // 创建一个简单的流程图
 * code: `
 *   graph TD
 *     A[开始] --> B[处理]
 *     B --> C[结束]
 * `
 *
 * @example
 * // 创建一个序列图
 * code: `
 *   sequenceDiagram
 *     participant A as 用户
 *     participant B as 系统
 *     A->>B: 发起请求
 *     B-->>A: 返回响应
 * `
 */
export const buildMermaidBlock = defineTool({
  name: "build_mermaid_block",
  description: {
    summary:
      "构建飞书文档的 Mermaid 文本绘图块数据结构。Mermaid 是一种基于文本的绘图语法，支持流程图、序列图、甘特图、类图、状态图、ER图、用户旅程图等多种图表类型。",
    bestFor:
      "创建流程图、序列图、甘特图、类图、状态图、ER图、饼图、关系图等文本绘制的图表，适合技术文档、系统架构图、业务流程可视化",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_nested_blocks）、需要精确控制图形样式时（Mermaid 样式自定义能力有限）",
  },
  inputSchema: {
    code: z
      .string()
      .min(1)
      .describe(
        "Mermaid 绘图代码，符合 Mermaid 语法规范。支持 graph（流程图）、sequenceDiagram（序列图）、gantt（甘特图）、classDiagram（类图）、stateDiagram（状态图）、erDiagram（ER图）、pie（饼图）、journey（用户旅程图）等。",
      ),
    theme: z
      .enum(["default", "dark", "forest", "neutral"])
      .optional()
      .describe(
        "图表主题样式。default: 默认主题；dark: 深色主题；forest: 森林主题；neutral: 中性主题。默认为 default。",
      ),
  },
  outputSchema: mermaidBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const theme: MermaidTheme = (args.theme ?? "default") as MermaidTheme;

    // 构建 record 对象并序列化为 JSON 字符串
    const record: MermaidRecord = {
      data: args.code,
      theme,
      view: "chart",
    };

    const block = {
      block_type: 40 as const,
      add_ons: {
        component_id: "",
        component_type_id: "blk_631fefbbae02400430b8f9f4",
        record: JSON.stringify(record),
      } satisfies MermaidAddOns,
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
