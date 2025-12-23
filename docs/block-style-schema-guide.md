# 块样式 Schema 使用指南

本文档介绍如何使用 `schemas.ts` 中定义的块样式 Schema。

## 导入

```typescript
import {
  // 样式 Schemas
  baseBlockStyleSchema,
  textBlockStyleSchema,
  headingBlockStyleSchema,
  codeBlockStyleSchema,
  todoBlockStyleSchema,
  listBlockStyleSchema,
  quoteBlockStyleSchema,

  // 文本元素 Schemas
  textElementStyleSchema,
  textRunSchema,
  textElementSchema,

  // 枚举和常量
  BlockBackgroundColor,
  AlignNumber,
  IndentationLevel,
  CodeLanguage,
  BLOCK_TYPE_MAP,

  // TypeScript 类型
  type TextBlockStyle,
  type HeadingBlockStyle,
  type CodeBlockStyle,
  type TextElementStyle,
} from "./tools/docx/blocks/schemas.js";
```

## 基础块样式 Schema

### 1. 基础样式（适用所有文本块）

`baseBlockStyleSchema` 是所有文本类块的基础样式定义：

```typescript
const baseStyle = {
  align: 2,                              // 居中对齐
  folded: false,                         // 不折叠
  background_color: "LightBlueBackground", // 浅蓝色背景
};

// 验证样式
const validatedStyle = baseBlockStyleSchema.parse(baseStyle);
```

### 2. Text 块样式

Text 块支持缩进功能：

```typescript
import { textBlockStyleSchema } from "./tools/docx/blocks/schemas.js";

const textStyle = {
  align: 1,                              // 居左
  indentation_level: "OneLevelIndent",    // 一级缩进
  background_color: "LightYellowBackground",
};

const validatedTextStyle = textBlockStyleSchema.parse(textStyle);
```

### 3. Heading 块样式

Heading 块（标题1-9）可以折叠子内容：

```typescript
import { headingBlockStyleSchema } from "./tools/docx/blocks/schemas.js";

const headingStyle = {
  align: 2,                    // 居中
  folded: true,                // 折叠子内容
  background_color: "DarkGrayBackground",
};

const validatedHeadingStyle = headingBlockStyleSchema.parse(headingStyle);
```

### 4. Code 块样式

Code 块支持语言类型和自动换行：

```typescript
import { codeBlockStyleSchema } from "./tools/docx/blocks/schemas.js";

const codeStyle = {
  language: 63,               // TypeScript (63)
  wrap: true,                 // 自动换行
  background_color: "DarkGrayBackground",
};

// 常用语言编号：
// 1: PlainText
// 7: Bash
// 22: Go
// 29: Java
// 30: JavaScript
// 49: Python
// 53: Rust
// 56: SQL
// 63: TypeScript

const validatedCodeStyle = codeBlockStyleSchema.parse(codeStyle);
```

### 5. Todo 块样式

Todo 块支持完成状态：

```typescript
import { todoBlockStyleSchema } from "./tools/docx/blocks/schemas.js";

const todoStyle = {
  done: false,                 // 未完成
  background_color: "LightRedBackground",
};

const validatedTodoStyle = todoBlockStyleSchema.parse(todoStyle);
```

### 6. 列表块样式

Bullet（无序列表）和 Ordered（有序列表）块样式：

```typescript
import { listBlockStyleSchema } from "./tools/docx/blocks/schemas.js";

const listStyle = {
  align: 1,                    // 居左
  folded: false,               // 不折叠（仅当有子块时有效）
  background_color: "LightGreenBackground",
};

const validatedListStyle = listBlockStyleSchema.parse(listStyle);
```

### 7. Quote 块样式

引用块样式：

```typescript
import { quoteBlockStyleSchema } from "./tools/docx/blocks/schemas.js";

const quoteStyle = {
  align: 1,
  background_color: "LightPurpleBackground",
};

const validatedQuoteStyle = quoteBlockStyleSchema.parse(quoteStyle);
```

## 文本元素样式

### 文本局部样式（富文本格式）

```typescript
import { textElementStyleSchema } from "./tools/docx/blocks/schemas.js";

const textElementStyle = {
  bold: true,               // 加粗
  italic: false,            // 非斜体
  underline: true,          // 下划线
  inline_code: false,       // 非行内代码
  text_color: 5,            // 蓝色
  background_color: 4,      // 浅绿色背景
};

// 文本颜色：1=红，2=橙，3=黄，4=绿，5=蓝，6=紫，7=灰
// 背景颜色：1-7=浅色系，8-14=深色系，15=浅灰

const validatedElementStyle = textElementStyleSchema.parse(textElementStyle);
```

### 文本运行（text_run）

```typescript
import { textRunSchema } from "./tools/docx/blocks/schemas.js";

const textRun = {
  content: "这是一段加粗的蓝色文本",
  text_element_style: {
    bold: true,
    text_color: 5,
  },
};

const validatedTextRun = textRunSchema.parse(textRun);
```

## 在 defineTool 中使用

### 示例：创建 Text 块工具

```typescript
import { z } from "zod";
import { defineTool } from "../../../define-tool.js";
import { textBlockStyleSchema, textRunSchema } from "./schemas.js";

export const createTextBlock = defineTool({
  name: "create_text_block",
  description: "在文档中创建文本块",
  inputSchema: {
    document_id: z.string().describe("文档ID"),
    block_id: z.string().describe("父块ID"),
    content: z.string().describe("文本内容"),
    style: textBlockStyleSchema.optional(),
  },
  callback: async (context, args) => {
    // 构建块数据
    const blockData = {
      block_type: 2, // Text 块
      text: {
        style: args.style || {},
        elements: [
          {
            text_run: {
              content: args.content,
            },
          },
        ],
      },
    };

    // 调用飞书 API...
    // ...
  },
});
```

### 示例：创建 Heading1 块工具

```typescript
import { z } from "zod";
import { defineTool } from "../../../define-tool.js";
import { headingBlockStyleSchema, textRunSchema } from "./schemas.js";

export const createHeading1Block = defineTool({
  name: "create_heading1_block",
  description: "在文档中创建一级标题",
  inputSchema: {
    document_id: z.string().describe("文档ID"),
    block_id: z.string().describe("父块ID"),
    content: z.string().describe("标题文本"),
    style: headingBlockStyleSchema.optional(),
  },
  callback: async (context, args) => {
    const blockData = {
      block_type: 3, // Heading1 块
      heading1: {
        style: args.style || {},
        elements: [
          {
            text_run: {
              content: args.content,
            },
          },
        ],
      },
    };

    // 调用飞书 API...
    // ...
  },
});
```

### 示例：创建带样式的 Code 块

```typescript
import { z } from "zod";
import { defineTool } from "../../../define-tool.js";
import { codeBlockStyleSchema } from "./schemas.js";

export const createCodeBlock = defineTool({
  name: "create_code_block",
  description: "在文档中创建代码块",
  inputSchema: {
    document_id: z.string().describe("文档ID"),
    block_id: z.string().describe("父块ID"),
    code: z.string().describe("代码内容"),
    language: z.number().int().min(1).max(75).optional().describe("语言类型"),
    wrap: z.boolean().optional().describe("是否自动换行"),
  },
  callback: async (context, args) => {
    const blockData = {
      block_type: 14, // Code 块
      code: {
        style: {
          language: args.language || 1, // 默认 PlainText
          wrap: args.wrap ?? false,
        },
        elements: [
          {
            text_run: {
              content: args.code,
            },
          },
        ],
      },
    };

    // 调用飞书 API...
    // ...
  },
});
```

## 块类型常量

使用 `BLOCK_TYPE_MAP` 来获取块类型对应的名称：

```typescript
import { BLOCK_TYPE_MAP } from "./schemas.js";

console.log(BLOCK_TYPE_MAP[2]);  // "text"
console.log(BLOCK_TYPE_MAP[3]);  // "heading1"
console.log(BLOCK_TYPE_MAP[14]); // "code"
console.log(BLOCK_TYPE_MAP[15]); // "quote"
```

## 完整示例：创建带富文本格式的文本块

```typescript
import { textBlockStyleSchema, textElementStyleSchema } from "./schemas.js";

const richTextBlock = {
  block_type: 2,
  text: {
    style: {
      align: 1,
      indentation_level: "OneLevelIndent",
      background_color: "LightYellowBackground",
    },
    elements: [
      {
        text_run: {
          content: "这是普通文本，",
        },
      },
      {
        text_run: {
          content: "这是加粗的红色文本",
          text_element_style: {
            bold: true,
            text_color: 1,
          },
        },
      },
      {
        text_run: {
          content: "，这是带下划线的蓝色文本",
          text_element_style: {
            underline: true,
            text_color: 5,
          },
        },
      },
    ],
  },
};

// 验证样式
const validatedStyle = textBlockStyleSchema.parse(richTextBlock.text.style);
```

## Style 属性参考速查表

### 对齐方式（align）

| 值 | 说明 |
|----|------|
| 1  | 居左排版（默认） |
| 2  | 居中排版 |
| 3  | 居右排版 |

### 背景颜色（background_color）

| 值 | 说明 |
|----|------|
| LightGrayBackground | 浅灰色 |
| LightRedBackground | 浅红色 |
| LightOrangeBackground | 浅橙色 |
| LightYellowBackground | 浅黄色 |
| LightGreenBackground | 浅绿色 |
| LightBlueBackground | 浅蓝色 |
| LightPurpleBackground | 浅紫色 |
| PaleGrayBackground | 中灰色 |
| DarkGrayBackground | 灰色 |
| DarkRedBackground | 中红色 |
| DarkOrangeBackground | 中橙色 |
| DarkYellowBackground | 中黄色 |
| DarkGreenBackground | 中绿色 |
| DarkBlueBackground | 中蓝色 |
| DarkPurpleBackground | 中紫色 |

### 缩进级别（indentation_level）- 仅 Text 块

| 值 | 说明 |
|----|------|
| NoIndent | 无缩进 |
| OneLevelIndent | 一级缩进 |

### 常用代码语言（language）- 仅 Code 块

| 值 | 语言 |
|----|------|
| 1  | PlainText |
| 7  | Bash |
| 22 | Go |
| 29 | Java |
| 30 | JavaScript |
| 49 | Python |
| 53 | Rust |
| 56 | SQL |
| 63 | TypeScript |

完整语言列表见飞书 API 文档。

### 文本颜色（text_color）

| 值 | 颜色 |
|----|------|
| 1  | 红色 |
| 2  | 橙色 |
| 3  | 黄色 |
| 4  | 绿色 |
| 5  | 蓝色 |
| 6  | 紫色 |
| 7  | 灰色 |

### 文本背景色（text_element_style.background_color）

| 值 | 说明 |
|----|------|
| 1-7 | 浅色系（红橙黄绿蓝紫灰） |
| 8-14 | 深色系（红橙黄绿蓝紫灰） |
| 15 | 浅灰色 |

## 类型安全

所有 schema 都导出了对应的 TypeScript 类型：

```typescript
import type {
  BaseBlockStyle,
  TextBlockStyle,
  HeadingBlockStyle,
  CodeBlockStyle,
  TodoBlockStyle,
  ListBlockStyle,
  QuoteBlockStyle,
  TextElementStyle,
  TextRun,
  TextElement,
} from "./schemas.js";

// 使用类型
function createStyledText(style: TextBlockStyle, content: string) {
  // ...
}

function formatTextElement(style: TextElementStyle): string {
  // ...
}
```

## 最佳实践

1. **复用 Schema**: 不同块类型共享基础 schema，减少重复定义
2. **类型安全**: 使用 TypeScript 类型确保样式属性正确
3. **验证输入**: 使用 `schema.parse()` 验证用户输入的样式数据
4. **文档化**: 在工具描述中说明哪些样式属性在该块类型中有效
5. **默认值**: 为可选样式提供合理的默认值
6. **错误处理**: 使用 zod 的验证错误提供清晰的错误信息

## 参考

- [飞书开放平台 - 创建块 API](https://open.feishu.cn/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/document-docx/docx-v1/document-block-children/create)
- [Text vs Heading1 Style 对比分析](../../text-vs-heading1-style-analysis.md)
- [块类型文档](../../docs/blocks/README.md)
