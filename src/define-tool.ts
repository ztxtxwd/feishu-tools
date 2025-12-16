import type { ToolDefinition, FeishuToolCallback, ToolDescription } from "./types.js";
import { formatDescription } from "./types.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";

/**
 * 定义工具的配置参数
 */
interface DefineToolConfig<
  InputArgs extends ZodRawShapeCompat,
  OutputArgs extends ZodRawShapeCompat = ZodRawShapeCompat,
> {
  name: string;
  description?: ToolDescription;
  inputSchema: InputArgs;
  outputSchema?: OutputArgs;
  annotations?: ToolAnnotations;
  callback: FeishuToolCallback<InputArgs>;
}

/**
 * 辅助函数，用于定义飞书工具，提供类型推断
 */
export function defineTool<
  InputArgs extends ZodRawShapeCompat,
  OutputArgs extends ZodRawShapeCompat = ZodRawShapeCompat,
>(config: DefineToolConfig<InputArgs, OutputArgs>): ToolDefinition<InputArgs, OutputArgs> {
  const { description, ...rest } = config;
  return {
    ...rest,
    description: description ? formatDescription(description) : undefined,
  } as ToolDefinition<InputArgs, OutputArgs>;
}
