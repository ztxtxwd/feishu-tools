# Pattern B: Direct HTTP Request Tool Template

当 SDK 不支持该 API 时，使用此模板进行直接 HTTP 请求。

## 完整代码模板

```typescript
import { z } from "zod";
import { defineTool } from "<relative-path>/define-tool.js";
import { resolveToken } from "<relative-path>/utils/token.js";

// 复杂嵌套结构单独定义
const nestedSchema = z.object({
  field1: z.string().describe("字段描述"),
  field2: z.string().optional().describe("可选字段"),
});

// API 响应类型定义（必须包含 index signature）
interface ApiResponse {
  [key: string]: unknown;
  // 定义实际响应字段
  id?: string;
  data?: Record<string, unknown>;
}

export const <toolName> = defineTool({
  name: "<snake_case_name>",
  description: {
    summary: "<清晰的中文描述，说明工具的用途>",
    bestFor: "<最适合的使用场景>",
    notRecommendedFor: "<不推荐使用的场景>",
  },
  inputSchema: {
    resourceId: z.string().describe("资源 ID"),
    queryParam: z.string().optional().describe("查询参数"),
    bodyField: nestedSchema.optional().describe("请求体字段"),
  },
  outputSchema: {
    result: z.object({...}).describe("返回结果"),
  },
  callback: async (context, args) => {
    const userAccessToken = await resolveToken(context.getUserAccessToken);
    const tenantAccessToken = await resolveToken(context.getTenantAccessToken);
    const token = userAccessToken || tenantAccessToken;

    if (!token) {
      return {
        content: [{ type: "text" as const, text: "Error: Access token is required (user_access_token or tenant_access_token)" }],
        isError: true,
      };
    }

    // 构建 URL（query 参数需要手动处理）
    const params = new URLSearchParams();
    if (args.queryParam) params.append("param", args.queryParam);
    const queryString = params.toString();
    const url = `https://open.feishu.cn/open-apis/<path>/${args.resourceId}${queryString ? `?${queryString}` : ""}`;

    try {
      const response = await fetch(url, {
        method: "POST", // GET, PUT, DELETE, PATCH
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ field: args.bodyField }),
      });

      const result = await response.json() as { code: number; msg: string; data?: ApiResponse };

      if (result.code !== 0) {
        if (result.code === 99991400) {
          return {
            content: [{ type: "text" as const, text: `应用频率限制：已超过调用频率上限。请使用指数退避算法降低调用速率后重试。\n错误码: ${result.code}\n错误信息: ${result.msg || '请求过于频繁'}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: `${result.msg} (code: ${result.code})` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }],
        structuredContent: result.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('99991400') || message.includes('rate limit') || message.includes('频率限制')) {
        return {
          content: [{ type: "text" as const, text: `应用频率限制：已超过调用频率上限。请使用指数退避算法降低调用速率后重试。\n错误信息: ${message}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
});
```

## 关键要点

1. **Token 获取**：使用 `resolveToken()` 获取 UAT 或 TAT
2. **URL 构建**：使用 `URLSearchParams` 处理 query 参数
3. **响应类型**：ApiResponse 接口必须包含 `[key: string]: unknown`
4. **错误处理**：与 SDK 模式相同

## 何时使用此模式

- 飞书文档中没有 Node.js SDK 示例
- 用户明确确认 SDK 不支持该 API
- 需要使用 UAT (User Access Token) 且 SDK 不支持
