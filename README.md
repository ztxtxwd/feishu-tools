# feishu-tools

飞书 SDK 封装库，用于 MCP Server 和 Agent 开发。

每个工具封装一个飞书 SDK 操作，包含名称、描述、参数 schema（Zod）和回调函数，可直接注册到 MCP Server 或转换为 LangChain Tool。

## 安装

```bash
npm install feishu-tools
```

## 快速开始

### MCP Server 集成

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@larksuiteoapi/node-sdk";
import { registerTools, createHeading1Block, createTextBlock } from "feishu-tools";

const client = new Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
});

const server = new McpServer({
  name: "feishu-mcp",
  version: "1.0.0",
});

// 注册工具
registerTools(server, [createHeading1Block, createTextBlock], { client });
```

### LangChain 集成

```typescript
import { Client } from "@larksuiteoapi/node-sdk";
import { toLangChainTools, createHeading1Block, createTextBlock } from "feishu-tools";

const client = new Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
});

const tools = toLangChainTools(
  [createHeading1Block, createTextBlock],
  { client }
);

// 在 LangGraph agent 中使用
const agent = createReactAgent({ llm, tools });
```

### 用户访问令牌（UAT）支持

对于需要用户身份的操作，支持静态 token 或动态获取函数：

```typescript
// 方式 1: 静态 token（适用于短期任务）
registerTools(server, tools, {
  client,
  getUserAccessToken: "u-xxx",
});

// 方式 2: 动态获取函数（推荐，支持 token 刷新）
registerTools(server, tools, {
  client,
  getUserAccessToken: async () => {
    // 从存储获取最新 token，支持自动刷新
    return await getLatestUserAccessToken();
  },
});
```

## 内置工具

### 文档（Docx）

| 工具名 | 描述 |
|--------|------|
| `createHeading1Block` | 在飞书文档的指定位置创建一级标题块 |
| `createTextBlock` | 在飞书文档的指定位置创建文本块 |

## 自定义工具

使用 `defineTool` 创建自定义工具：

```typescript
import { z } from "zod";
import { defineTool } from "feishu-tools";

export const createQuoteBlock = defineTool({
  name: "create_quote_block",
  description: "在飞书文档的指定位置创建引用块",
  inputSchema: {
    document_id: z.string().describe("文档 ID"),
    block_id: z.string().describe("父块 ID"),
    index: z.number().int().min(0).describe("插入位置索引"),
    text: z.string().describe("引用文本内容"),
  },
  callback: async (context, args) => {
    if (!context.client) {
      return {
        content: [{ type: "text", text: "Error: Feishu client is required" }],
        isError: true,
      };
    }

    const response = await context.client.docx.v1.documentBlockChildren.create({
      path: {
        document_id: args.document_id,
        block_id: args.block_id,
      },
      params: { document_revision_id: -1 },
      data: {
        index: args.index,
        children: [
          {
            block_type: 15, // quote
            quote: {
              elements: [{ text_run: { content: args.text } }],
            },
          },
        ],
      },
    });

    if (response.code !== 0) {
      return {
        content: [{ type: "text", text: response.msg || `API error: ${response.code}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  },
});
```

## API

### `registerTools(server, tools, context)`

将工具批量注册到 MCP Server。

- `server`: MCP Server 实例
- `tools`: 工具定义数组
- `context`: 飞书上下文
  - `client`: 飞书 SDK Client 实例
  - `getTenantAccessToken?`: 租户访问令牌（字符串或返回字符串的函数）
  - `getUserAccessToken?`: 用户访问令牌（字符串或返回字符串的函数）

### `toLangChainTools(tools, context)`

将工具批量转换为 LangChain StructuredTool。

### `defineTool(definition)`

定义工具的辅助函数，提供完整的类型推断。

## 飞书文档 Block 类型

| 类型 | block_type |
|------|------------|
| text | 2 |
| heading1 | 3 |
| heading2 | 4 |
| heading3 | 5 |
| heading4 | 6 |
| heading5 | 7 |
| heading6 | 8 |
| heading7 | 9 |
| heading8 | 10 |
| heading9 | 11 |
| bullet | 12 |
| ordered | 13 |
| code | 14 |
| quote | 15 |

## 开发

```bash
npm run build      # 编译 TypeScript
npm run dev        # 监听模式编译
npm run test       # 运行测试（watch 模式）
npm run test:run   # 运行测试（单次）
npm run lint       # ESLint 检查
npm run typecheck  # 类型检查
```

## License

MIT
