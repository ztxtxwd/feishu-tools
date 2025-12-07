/**
 * LangChain Tool Calling 示例
 *
 * 安装依赖:
 *   npm install @langchain/core @langchain/openai
 *
 * 运行:
 *   OPENAI_API_KEY=xxx FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx npx tsx examples/langchain-tool-calling.ts
 */

import { ChatOpenAI } from "@langchain/openai";
import { Client } from "@larksuiteoapi/node-sdk";

import {
  toLangChainTools,
  createHeading1Block,
  createTextBlock,
  type FeishuContext,
} from "../src/index.js";

// 创建飞书 Client
const feishuClient = new Client({
  appId: process.env.FEISHU_APP_ID!,
  appSecret: process.env.FEISHU_APP_SECRET!,
});

const context: FeishuContext = { client: feishuClient };

// 转换工具
const tools = toLangChainTools([createHeading1Block, createTextBlock], context);

// 绑定工具到模型
const model = new ChatOpenAI({ model: "gpt-4o" });
const modelWithTools = model.bindTools(tools);

// 调用模型
const response = await modelWithTools.invoke(
  "在文档 doc_xxx 的根块 blk_xxx 位置 0 创建标题'项目进度'"
);

// 处理 tool calls
const toolCalls = response.tool_calls || [];
for (const toolCall of toolCalls) {
  console.log(`Tool: ${toolCall.name}`);
  console.log(`Args: ${JSON.stringify(toolCall.args, null, 2)}`);
}
