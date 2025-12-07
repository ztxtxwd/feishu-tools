import type { ToolDefinition, FeishuToolCallback } from "./types.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { AnySchema, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";

/**
 * 定义工具的配置参数
 */
interface DefineToolConfig<
  InputArgs extends ZodRawShapeCompat | AnySchema,
  OutputArgs extends ZodRawShapeCompat | AnySchema = AnySchema,
> {
  name: string;
  description?: string;
  inputSchema: InputArgs;
  outputSchema?: OutputArgs;
  annotations?: ToolAnnotations;
  callback: FeishuToolCallback<InputArgs>;
}

/**
 * 辅助函数，用于定义飞书工具，提供类型推断
 */
export function defineTool<
  InputArgs extends ZodRawShapeCompat | AnySchema,
  OutputArgs extends ZodRawShapeCompat | AnySchema = AnySchema,
>(config: DefineToolConfig<InputArgs, OutputArgs>): ToolDefinition<OutputArgs, InputArgs> {
  return config as ToolDefinition<OutputArgs, InputArgs>;
}
