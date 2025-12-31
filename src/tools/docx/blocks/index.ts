export { batchDeleteBlocks } from "./batch-delete-blocks.js";
export { listDocumentBlocks } from "./list-blocks.js";
export { createNestedBlocks } from "./create-nested-blocks.js";

// Text Block
export { buildTextBlock } from "./build-text-block.js";

// Heading Blocks
export {
  buildHeading1Block,
  buildHeading2Block,
  buildHeading3Block,
  buildHeading4Block,
  buildHeading5Block,
  buildHeading6Block,
  buildHeading7Block,
  buildHeading8Block,
  buildHeading9Block,
} from "./build-heading-blocks.js";

// List Blocks
export { buildBulletBlock } from "./build-bullet-block.js";
export { buildOrderedBlock } from "./build-ordered-block.js";

// Quote Block
export { buildQuoteBlock } from "./build-quote-block.js";

// Equation Block
export { buildEquationBlock } from "./build-equation-block.js";

// Todo Block
export { buildTodoBlock } from "./build-todo-block.js";

// Code Block
export { buildCodeBlock } from "./build-code-block.js";

// Divider Block
export { buildDividerBlock } from "./build-divider-block.js";

// Callout Block
export { buildCalloutBlock } from "./build-callout-block.js";
export { searchFeishuCalloutEmoji } from "./search-feishu-callout-emoji.js";

// File Block
export { createFileBlock } from "./create-file-block.js";

// Image Block
export { createImageBlock } from "./create-image-block.js";

// Iframe Block
export { buildIframeBlock } from "./build-iframe-block.js";

// ChatCard Block
export { buildChatCardBlock } from "./build-chat-card-block.js";

// Grid Block
export { buildGridBlock } from "./build-grid-block.js";

// Mermaid Block
export { buildMermaidBlock } from "./build-mermaid-block.js";

// Glossary Block
export { buildGlossaryBlock } from "./build-glossary-block.js";

// 导出 schemas（旧版，保持兼容）
export * from "./schemas.js";

// 导出工厂函数（供扩展使用）
export {
  createTextBlockTool,
  type TextBlockConfig,
} from "./factories/index.js";

// 导出新 schemas（使用命名空间避免冲突）
export * as textElementSchemas from "./schemas/index.js";
