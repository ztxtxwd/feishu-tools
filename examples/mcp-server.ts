import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@larksuiteoapi/node-sdk";
import {
  registerTools,
  createHeading1Block,
  createTextBlock,
} from "../src/index.js";

// 创建飞书 Client
const feishuClient = new Client({
  appId: process.env.FEISHU_APP_ID!,
  appSecret: process.env.FEISHU_APP_SECRET!,
});

// 创建 MCP Server
const server = new McpServer({
  name: "feishu-tools",
  version: "0.1.0",
});

// 批量注册工具
registerTools(server, [createHeading1Block, createTextBlock], {
  client: feishuClient,
  getTenantAccessToken: async () => {
    return "test";
  },
  getUserAccessToken: async () => {
    return "test";
  },
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
