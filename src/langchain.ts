import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import type { ShapeOutput, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ToolDefinition, FeishuContext } from "./types.js";

/**
 * 将 MCP CallToolResult 转换为字符串
 *
 * MCP 工具返回格式: { content: [{ type: "text", text: "..." }, ...], isError?: boolean }
 * LangChain 工具返回格式: string
 */
function extractText(result: { content: { type: string; text?: string }[]; isError?: boolean }): string {
  const text = result.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("\n");

  if (result.isError) {
    throw new Error(text);
  }

  return text;
}

/**
 * 将单个 feishu-tools 的 ToolDefinition 转换为 LangChain tool
 */
export function toLangChainTool(
  toolDef: ToolDefinition,
  context: FeishuContext
): StructuredToolInterface {
  return tool(
    async (input: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP RequestHandlerExtra not needed for LangChain
      const result = await toolDef.callback(context, input as ShapeOutput<ZodRawShapeCompat>, {} as any);
      return extractText(result);
    },
    {
      name: toolDef.name,
      description: toolDef.description || "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod schema type mismatch between MCP SDK and LangChain
      schema: toolDef.inputSchema as any,
    }
  );
}

/**
 * 将多个 feishu-tools 的 ToolDefinition 批量转换为 LangChain tools
 */
export function toLangChainTools(
  tools: ToolDefinition[],
  context: FeishuContext
): StructuredToolInterface[] {
  return tools.map((t) => toLangChainTool(t, context));
}
