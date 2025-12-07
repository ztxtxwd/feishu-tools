import type { Client } from "@larksuiteoapi/node-sdk";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { CallToolResult, ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { AnySchema, SchemaOutput, ShapeOutput, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/**
 * 飞书凭证上下文
 */
export interface FeishuContext {
  /** 飞书 SDK Client 实例 */
  client?: Client;
  /** 获取租户访问令牌的函数，每次调用时动态获取以应对过期刷新 */
  getTenantAccessToken?: () => Promise<string>;
  /** 获取用户访问令牌的函数，每次调用时动态获取以应对过期刷新 */
  getUserAccessToken?: () => Promise<string>;
}

/**
 * 飞书工具的回调函数类型
 */
export type FeishuToolCallback<Args extends undefined | ZodRawShapeCompat | AnySchema = undefined> =
  Args extends ZodRawShapeCompat
    ? (context: FeishuContext, args: ShapeOutput<Args>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => CallToolResult | Promise<CallToolResult>
    : Args extends AnySchema
      ? (context: FeishuContext, args: SchemaOutput<Args>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => CallToolResult | Promise<CallToolResult>
      : (context: FeishuContext, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => CallToolResult | Promise<CallToolResult>;

/**
 * 工具定义接口，与 MCP registerTool 参数对齐
 */
export interface ToolDefinition<OutputArgs extends ZodRawShapeCompat | AnySchema, InputArgs extends undefined | ZodRawShapeCompat | AnySchema = undefined> {
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
