/**
 * 文本类块工厂函数
 *
 * 用于创建具有相同结构的文本类块工具：
 * - Text, Heading1~9, Bullet, Ordered, Quote, Todo, Code
 *
 * 这些块共享相同的 elements 结构，但有不同的 block_type 和可能的额外样式属性
 */
import { z, type ZodTypeAny } from "zod";
import { defineTool } from "../../../../define-tool.js";
import type { ToolDescription } from "../../../../types.js";
import {
  textElementSchema,
  baseBlockStyleSchema,
} from "../schemas/text-elements.js";

/**
 * 文本类块配置
 */
export interface TextBlockConfig {
  /** 块类型数字 */
  blockType: number;
  /** 块内容字段名（如 'text', 'heading1', 'bullet' 等） */
  blockName: string;
  /** 显示名称（如 '文本', '一级标题' 等） */
  displayName: string;
  /** 工具描述 */
  description: ToolDescription;
  /** 额外的样式属性（如 Code 的 language, wrap；Todo 的 done 等） */
  extraStyleSchema?: Record<string, ZodTypeAny>;
  /** 是否支持折叠（Heading1~9, Text 有子块时, Bullet, Ordered, Todo） */
  supportsFolded?: boolean;
  /** 是否支持缩进（仅 Text） */
  supportsIndentation?: boolean;
}

/**
 * 创建文本类块的样式 Schema
 */
function createBlockStyleSchema(config: TextBlockConfig) {
  const styleFields: Record<string, ZodTypeAny> = {
    ...baseBlockStyleSchema.shape,
  };

  if (config.supportsFolded) {
    styleFields.folded = z
      .boolean()
      .optional()
      .describe("折叠状态（有子块时有效）");
  }

  if (config.supportsIndentation) {
    styleFields.indentation_level = z
      .enum(["NoIndent", "OneLevelIndent"])
      .optional()
      .describe("首行缩进级别");
  }

  if (config.extraStyleSchema) {
    Object.assign(styleFields, config.extraStyleSchema);
  }

  return z.object(styleFields).describe(`${config.displayName}块样式`);
}

/**
 * 创建文本类块工具
 *
 * @param config 块配置
 * @returns ToolDefinition
 */
export function createTextBlockTool(config: TextBlockConfig) {
  const blockStyleSchema = createBlockStyleSchema(config);

  // 输入 Schema
  const inputSchema = {
    elements: z
      .array(textElementSchema)
      .min(1)
      .describe("文本元素数组，至少包含一个元素"),
    style: blockStyleSchema.optional(),
  };

  // 输出 Schema
  const outputSchema = {
    block_type: z
      .literal(config.blockType)
      .describe(`块类型，${config.displayName}块固定为 ${config.blockType}`),
    [config.blockName]: z
      .object({
        elements: z.array(textElementSchema).describe("文本元素数组"),
        style: blockStyleSchema.optional(),
      })
      .describe(`${config.displayName}块内容`),
  };

  return defineTool({
    name: `build_${config.blockName}_block`,
    description: config.description,
    inputSchema,
    outputSchema,
    annotations: {
      readOnlyHint: true,
    },
    callback: async (_context, args) => {
      const block = {
        block_type: config.blockType,
        [config.blockName]: {
          elements: args.elements,
          ...(args.style && { style: args.style }),
        },
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
}

