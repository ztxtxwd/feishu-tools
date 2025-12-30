import type { Client } from "@larksuiteoapi/node-sdk";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { CallToolResult, ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShapeCompat, ShapeOutput } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/**
 * Token Provider 类型，支持静态值或动态获取函数
 */
export type TokenProvider = string | (() => string | Promise<string>);

/**
 * 结构化工具描述
 */
export interface StructuredToolDescription {
  /** 工具的简短描述（必填） */
  summary: string;
  /** 工具最适合的使用场景 */
  bestFor?: string;
  /** 不推荐使用该工具的场景 */
  notRecommendedFor?: string;
  /** 使用指南，提供如何使用工具的详细说明 */
  usageGuide?: string;
}

/**
 * 工具描述类型，支持简单字符串或结构化对象
 */
export type ToolDescription = string | StructuredToolDescription;

/**
 * 将工具描述格式化为字符串
 * @param description - 工具描述（字符串或结构化对象）
 * @returns 格式化后的描述字符串
 */
export function formatDescription(description: ToolDescription): string {
  if (typeof description === "string") {
    return description;
  }

  const parts: string[] = [description.summary];

  if (description.bestFor) {
    parts.push(`**适用于:** ${description.bestFor}`);
  }

  if (description.notRecommendedFor) {
    parts.push(`**不适用于:** ${description.notRecommendedFor}`);
  }

  if (description.usageGuide) {
    parts.push(`**使用指南:** ${description.usageGuide}`);
  }

  return parts.join("\n\n");
}

/**
 * 飞书凭证上下文
 */
export interface FeishuContext {
  /** 飞书 SDK Client 实例 */
  client?: Client;
  /** 租户访问令牌（支持静态值或动态获取函数） */
  getTenantAccessToken?: TokenProvider;
  /** 用户访问令牌（支持静态值或动态获取函数） */
  getUserAccessToken?: TokenProvider;
}

/**
 * 飞书工具的回调函数类型
 */
export type FeishuToolCallback<Args extends ZodRawShapeCompat = ZodRawShapeCompat> = (
  context: FeishuContext,
  args: ShapeOutput<Args>,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) => CallToolResult | Promise<CallToolResult>;

/**
 * 工具定义接口，与 MCP registerTool 参数对齐
 */
export interface ToolDefinition<InputArgs extends ZodRawShapeCompat = ZodRawShapeCompat, OutputArgs extends ZodRawShapeCompat = ZodRawShapeCompat> {
  /** 工具名称，用于标识和调用 */
  name: string;
  /** 工具描述 */
  description?: string;
  /** 输入参数 schema */
  inputSchema: InputArgs;
  /** 输出 schema（可选） */
  outputSchema?: OutputArgs;
  /** 工具注解（可选） */
  annotations?: ToolAnnotations;
  /** 回调函数，执行实际的飞书 SDK 调用 */
  callback: FeishuToolCallback<InputArgs>;
}
