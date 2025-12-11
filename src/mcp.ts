import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import type { ShapeOutput, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ToolDefinition, FeishuContext } from "./types.js";

/**
 * 将 feishu-tools 工具批量注册到 MCP Server
 */
export function registerTools(
  server: McpServer,
  tools: ToolDefinition[],
  context: FeishuContext
): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: tool.annotations,
      },
      (args: unknown, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) =>
        tool.callback(context, args as ShapeOutput<ZodRawShapeCompat>, extra)
    );
  }
}
