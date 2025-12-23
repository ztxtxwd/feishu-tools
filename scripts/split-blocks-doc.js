#!/usr/bin/env node
/**
 * 拆分飞书文档创建块API文档
 * 将一个包含所有块类型的大文档拆分为每种块类型的单独文档
 *
 * 用法:
 *   node split-blocks-doc.js [输入文件] [输出目录]
 *
 * 参数:
 *   输入文件  原始的创建块API文档路径 (默认: ./创建块.md)
 *   输出目录  拆分后文档的输出目录 (默认: ./docs/blocks)
 *
 * 示例:
 *   node split-blocks-doc.js
 *   node split-blocks-doc.js ./创建块.md ./output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 解析命令行参数
const args = process.argv.slice(2);
const INPUT_FILE_ARG = args[0] || path.join(__dirname, '创建块.md');
const OUTPUT_DIR_ARG = args[1] || path.join(__dirname, 'docs/blocks');

// 块类型映射表（根据文档内容）
const BLOCK_TYPES = {
  1: 'page',
  2: 'text',
  3: 'heading1',
  4: 'heading2',
  5: 'heading3',
  6: 'heading4',
  7: 'heading5',
  8: 'heading6',
  9: 'heading7',
  10: 'heading8',
  11: 'heading9',
  12: 'bullet',
  13: 'ordered',
  14: 'code',
  15: 'quote',
  17: 'todo',
  18: 'bitable',
  19: 'callout',
  20: 'chat_card',
  21: 'diagram',
  22: 'divider',
  23: 'file',
  24: 'grid',
  25: 'grid_column',
  26: 'iframe',
  27: 'image',
  28: 'isv',
  29: 'mindnote',
  30: 'sheet',
  31: 'table',
  32: 'table_cell',
  33: 'view',
  34: 'quote_container',
  35: 'task',
  36: 'okr',
  37: 'okr_objective',
  38: 'okr_key_result',
  39: 'okr_progress',
  40: 'widget',
  41: 'jira',
  42: 'wiki_catalog',
  43: 'board',
  44: 'agenda',
  45: 'agenda_item',
  46: 'agenda_item_title',
  47: 'agenda_item_content',
  48: 'link_preview',
  49: 'sync_block',
  50: 'reference_sync_block',
  51: 'wiki_catalog_new',
  52: 'ai_template',
  16: 'equation', // 补充
};

const INPUT_FILE = INPUT_FILE_ARG;
const OUTPUT_DIR = OUTPUT_DIR_ARG;

// 检查输入文件是否存在
if (!fs.existsSync(INPUT_FILE)) {
  console.error(`错误: 输入文件不存在: ${INPUT_FILE}`);
  console.error(`\n用法: node split-blocks-doc.js [输入文件] [输出目录]`);
  process.exit(1);
}

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`创建输出目录: ${OUTPUT_DIR}\n`);
}

console.log(`输入文件: ${INPUT_FILE}`);
console.log(`输出目录: ${OUTPUT_DIR}`);
console.log(`开始读取文档...\n`);
const content = fs.readFileSync(INPUT_FILE, 'utf-8');
const lines = content.split('\n');

// 提取公共部分（从文档开始到请求体之前）
let headerEndIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '### 请求体') {
    headerEndIndex = i;
    break;
  }
}

if (headerEndIndex === -1) {
  console.error('未找到请求体部分');
  process.exit(1);
}

const commonHeader = lines.slice(0, headerEndIndex + 1).join('\n');

// 查找请求体children字段的开始位置
let childrenStartIndex = -1;
for (let i = headerEndIndex; i < lines.length; i++) {
  if (lines[i].includes('children | block') || lines[i].includes('children |')) {
    childrenStartIndex = i + 1;
    break;
  }
}

if (childrenStartIndex === -1) {
  console.error('未找到children字段');
  process.exit(1);
}

// 查找响应体的开始位置
let responseStartIndex = -1;
for (let i = childrenStartIndex; i < lines.length; i++) {
  if (lines[i].trim().startsWith('## 响应') || lines[i].trim().startsWith('###')) {
    // 找到第一个### 或 ## 响应，说明请求体结束
    if (lines[i].includes('响应')) {
      responseStartIndex = i;
      break;
    }
  }
}

if (responseStartIndex === -1) {
  console.error('未找到响应部分');
  process.exit(1);
}

console.log(`公共头部: 0-${headerEndIndex}`);
console.log(`children字段开始: ${childrenStartIndex}`);
console.log(`响应部分开始: ${responseStartIndex}`);

// 提取每种块类型的字段定义
// 策略：查找每个块类型名称（如 text |、heading1 | 等）作为起始标记
const blockFieldsMap = {};

// 先找到所有块类型的起始行
const blockTypeLines = [];
for (let i = childrenStartIndex; i < responseStartIndex; i++) {
  const line = lines[i];
  // 匹配格式: "text | text | 否 | 文本 Block"
  const match = line.match(/^(\w+)\s*\|\s*(\w+)\s*\|\s*[否是]\s*\|\s*(.+Block)/);
  if (match) {
    const blockTypeName = match[1];
    // 确保这是一个块类型字段（不是通用字段）
    if (BLOCK_TYPES && Object.values(BLOCK_TYPES).includes(blockTypeName)) {
      blockTypeLines.push({ lineIndex: i, blockTypeName, line });
    }
  }
}

console.log(`\n找到 ${blockTypeLines.length} 个块类型定义:\n`);
blockTypeLines.forEach(b => console.log(`  ${b.blockTypeName} at line ${b.lineIndex}`));

// 提取每个块类型的字段
for (let idx = 0; idx < blockTypeLines.length; idx++) {
  const current = blockTypeLines[idx];
  const next = blockTypeLines[idx + 1];

  const startLine = current.lineIndex;
  const endLine = next ? next.lineIndex : responseStartIndex;

  const blockTypeName = current.blockTypeName;
  const blockFields = lines.slice(startLine, endLine).join('\n');

  blockFieldsMap[blockTypeName] = blockFields;

  console.log(`\n提取 ${blockTypeName}: 行 ${startLine}-${endLine} (${endLine - startLine} 行)`);
}

// 提取响应体部分
const responseContent = lines.slice(responseStartIndex).join('\n');

// 为每种块类型生成单独的文档
console.log('\n开始生成块类型文档...\n');

Object.entries(blockFieldsMap).forEach(([blockTypeName, fields]) => {
  const blockTypeNum = Object.entries(BLOCK_TYPES).find(([_, name]) => name === blockTypeName)?.[0];

  // 生成文档内容
  const docContent = `# 创建${blockTypeName}块

${commonHeader}

名称 | 类型 | 必填 | 描述
---|---|---|---
children | block[] | 否 | 添加的子块列表
${fields}

${responseContent}
`;

  // 写入文件
  const filename = `create-${blockTypeName}-block.md`;
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, docContent, 'utf-8');

  console.log(`✓ 生成: ${filename} (块类型: ${blockTypeNum || 'N/A'})`);
});

console.log(`\n完成！共生成 ${Object.keys(blockFieldsMap).length} 个文档文件`);
console.log(`输出目录: ${OUTPUT_DIR}`);
