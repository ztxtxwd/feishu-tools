# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

feishu-tools 是一个无状态的飞书 SDK 封装库，用于 MCP server 和 agent 开发。每个工具封装一个飞书 SDK 操作，包含名称、描述、参数 schema (zod) 和回调函数。

## 常用命令

```bash
npm run build      # 编译 TypeScript
npm run dev        # 监听模式编译
npm run typecheck  # 类型检查（不生成文件）
npm run test       # 运行测试（watch 模式）
npm run test:run   # 运行测试（单次）
npm run lint       # ESLint 检查
```

## 架构

### 核心概念

- **ToolDefinition**: 工具定义接口，与 MCP registerTool 对齐，包含 `name`、`description`、`inputSchema`、`outputSchema`、`annotations`、`callback`
- **ToolExecutor**: 工具注册和执行器，负责参数验证和调用回调
- **defineTool()**: 辅助函数，提供类型推断
- **registerTools()**: 批量注册工具到 MCP Server

### 文件结构

```
src/
  index.ts          # 主入口
  types.ts          # 核心类型定义
  define-tool.ts    # defineTool 辅助函数
  mcp.ts            # MCP Server 集成（registerTools）
  langchain.ts      # LangChain 集成
  tools/
    index.ts        # 汇总导出所有工具
    docx/           # 文档 API
      index.ts
      blocks/       # 块操作
        index.ts
        create-heading1.ts
        create-text.ts
    drive/          # 云盘 API（待实现）
    bitable/        # 多维表格 API（待实现）
    im/             # 即时消息 API（待实现）

tests/
  unit/             # 单元测试（镜像 src/tools 结构）
    tools/
      docx/
        blocks/
          create-heading1.test.ts
  integration/      # 集成测试（按模块组织）
    docx.test.ts
```

### 添加新工具

1. 在 `src/tools/<module>/<category>/` 下创建新文件
2. 使用 `defineTool()` 定义工具
3. 在对应目录的 `index.ts` 中逐级导出

```typescript
// 例如：src/tools/docx/blocks/create-quote.ts
import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

export const createQuoteBlock = defineTool({
  name: "create_quote_block",
  description: "在飞书文档的指定位置创建引用块",
  inputSchema: z.object({
    // 参数定义
  }),
  callback: async (context, args) => {
    // context 包含 { client?, getTenantAccessToken?, getUserAccessToken? }
    // 使用 context.client 调用飞书 SDK（推荐，自动管理 TAT）
    // 或使用 token provider 获取 token（支持动态刷新）
    if (!context.client) {
      return {
        content: [{ type: "text" as const, text: "Error: Feishu client is required" }],
        isError: true,
      };
    }
    // ... 调用 SDK
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
});
```

### MCP Server 集成

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@larksuiteoapi/node-sdk";
import { registerTools, createHeading1Block, createTextBlock } from "feishu-tools";

const client = new Client({ appId: "...", appSecret: "..." });
const server = new McpServer({ name: "feishu-tools", version: "0.1.0" });

// 方式 1: 使用 Client（推荐，自动管理 TAT）
registerTools(server, [createHeading1Block, createTextBlock], { client });

// 方式 2: 使用 Token Provider（支持 UAT 动态刷新）
registerTools(server, [createHeading1Block, createTextBlock], {
  client,
  getUserAccessToken: async () => {
    // 从存储获取或刷新 UAT
    return await refreshUserAccessToken();
  },
});
```

## 飞书文档 Block 类型常量

| 类型 | block_type |
|------|------------|
| text | 2 |
| heading1 | 4 |
| heading2 | 5 |
| heading3 | 6 |
| bullet | 12 |
| ordered | 13 |
| code | 14 |
| quote | 15 |
