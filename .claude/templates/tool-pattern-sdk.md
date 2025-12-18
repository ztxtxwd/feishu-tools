# Pattern A: SDK-based Tool Template

当 SDK 支持该 API 时，使用此模板。

## 完整代码模板

```typescript
import { z } from "zod";
import { defineTool } from "<relative-path>/define-tool.js";
import { cleanParams } from "<relative-path>/utils/clean-params.js";

export const <toolName> = defineTool({
  name: "<snake_case_name>",
  description: {
    summary: "<清晰的中文描述，说明工具的用途>",
    bestFor: "<最适合的使用场景>",
    notRecommendedFor: "<不推荐使用的场景>",
  },
  inputSchema: {
    // Required parameters first, optional with .optional()
    requiredParam: z.string().describe("必填参数描述"),
    optionalParam: z.number().optional().describe("可选参数描述"),
  },
  outputSchema: {
    result: z.object({...}).describe("返回结果描述"),
  },
  callback: async (context, args) => {
    if (!context.client) {
      return {
        content: [{ type: "text" as const, text: "Error: Feishu client is required" }],
        isError: true,
      };
    }

    try {
      const result = await context.client.<module>.<api>.<method>({
        path: { resource_id: args.resourceId },
        params: cleanParams({
          // 所有可选的 query 参数都必须用 cleanParams 包裹
          page_size: args.page_size,
          page_token: args.page_token,
        }),
        data: { /* request body */ },
      });

      if (result.code !== 0) {
        if (result.code === 99991400) {
          return {
            content: [{ type: "text" as const, text: `应用频率限制：已超过调用频率上限。请使用指数退避算法降低调用速率后重试。\n错误码: ${result.code}\n错误信息: ${result.msg || '请求过于频繁'}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: result.msg || `API error: ${result.code}` }],
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

1. **cleanParams 必须使用**：所有可选的 query/params 参数都要用 `cleanParams()` 包裹，它会自动移除 undefined 值
2. **context.client 检查**：回调开头必须检查 client 是否存在
3. **错误处理**：
   - `result.code !== 0` 检查 API 错误
   - `99991400` 是频率限制错误码
   - catch 块中也要检查频率限制
4. **structuredContent**：成功时返回 `structuredContent: result.data`

## Import 路径示例

根据文件位置调整相对路径：
- `src/tools/sheets/xxx.ts` → `../../define-tool.js`, `../../utils/clean-params.js`
- `src/tools/docx/blocks/xxx.ts` → `../../../define-tool.js`, `../../../utils/clean-params.js`
