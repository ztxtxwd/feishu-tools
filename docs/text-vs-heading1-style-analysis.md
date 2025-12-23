# Text 块 vs Heading1 块的 Style 属性分析

## 结论

**text 块和 heading1 块的 `style` 属性完全相同**，没有任何差异。

## Style 属性完整对比

### 相同的属性结构

```typescript
interface TextStyle {
  align?: number;              // 对齐方式
  done?: boolean;              // todo 完成状态
  folded?: boolean;            // 折叠状态
  language?: number;           // 代码块语言类型
  wrap?: boolean;              // 代码块自动换行
  background_color?: string;   // 块背景色
  indentation_level?: string;  // 首行缩进级别
}
```

## 属性详细对比

| 属性名 | 类型 | Text 块 | Heading1 块 | 说明 |
|--------|------|---------|-------------|------|
| **align** | int | ✓ | ✓ | 对齐方式：1=居左，2=居中，3=居右 |
| **done** | boolean | ✓ | ✓ | todo 完成状态（仅 Todo 块使用） |
| **folded** | boolean | ✓ | ✓ | 折叠状态（Heading1~9、Text、Ordered、Bullet、Todo 可用） |
| **language** | int | ✓ | ✓ | 代码块语言类型（仅 Code 块使用） |
| **wrap** | boolean | ✓ | ✓ | 代码块自动换行（仅 Code 块使用） |
| **background_color** | string | ✓ | ✓ | 块背景色（15 种颜色可选） |
| **indentation_level** | string | ✓ | ✓ | 首行缩进级别（仅 Text 块使用） |

## 详细属性说明

### 1. align - 对齐方式

**用途**: 两种块均支持
**类型**: `int`
**可选值**:
- `1`: 居左排版（默认）
- `2`: 居中排版
- `3`: 居右排版

### 2. done - 完成状态

**用途**: Todo 块专用（在 Text 和 Heading1 中不适用）
**类型**: `boolean`
**默认值**: `false`

### 3. folded - 折叠状态

**用途**: 两种块均支持
**类型**: `boolean`
**默认值**: `false`
**说明**:
- Heading1~9 块可以折叠
- 有子块的 Text、Ordered、Bullet、Todo 块可以折叠

### 4. language - 代码语言类型

**用途**: Code 块专用（在 Text 和 Heading1 中不适用）
**类型**: `int`
**可选值**: 75 种编程语言（PlainText, JavaScript, Python, Go, Rust 等）

### 5. wrap - 代码块自动换行

**用途**: Code 块专用（在 Text 和 Heading1 中不适用）
**类型**: `boolean`
**默认值**: `false`

### 6. background_color - 块背景色

**用途**: 两种块均支持
**类型**: `string`
**可选值**:
- `LightGrayBackground`: 浅灰色
- `LightRedBackground`: 浅红色
- `LightOrangeBackground`: 浅橙色
- `LightYellowBackground`: 浅黄色
- `LightGreenBackground`: 浅绿色
- `LightBlueBackground`: 浅蓝色
- `LightPurpleBackground`: 浅紫色
- `PaleGrayBackground`: 中灰色
- `DarkGrayBackground`: 灰色
- `DarkRedBackground`: 中红色
- `DarkOrangeBackground`: 中橙色
- `DarkYellowBackground`: 中黄色
- `DarkGreenBackground`: 中绿色
- `DarkBlueBackground`: 中蓝色
- `DarkPurpleBackground`: 中紫色

### 7. indentation_level - 首行缩进级别

**用途**: Text 块专用（在 Heading1 中不适用）
**类型**: `string`
**可选值**:
- `NoIndent`: 无缩进
- `OneLevelIndent`: 一级缩进

## 实际应用场景对比

### Text 块实际使用的 Style 属性

```typescript
{
  align: 1 | 2 | 3,              // ✓ 实际使用
  folded: boolean,                // ✓ 实际使用（当有子块时）
  background_color: string,       // ✓ 实际使用
  indentation_level: string,      // ✓ 实际使用（Text 块特有）

  // 以下属性在 Text 块中无实际作用
  done: boolean,                  // ✗ Todo 块专用
  language: number,               // ✗ Code 块专用
  wrap: boolean,                  // ✗ Code 块专用
}
```

### Heading1 块实际使用的 Style 属性

```typescript
{
  align: 1 | 2 | 3,              // ✓ 实际使用
  folded: boolean,                // ✓ 实际使用（标题可折叠子内容）
  background_color: string,       // ✓ 实际使用

  // 以下属性在 Heading1 块中无实际作用
  done: boolean,                  // ✗ Todo 块专用
  language: number,               // ✗ Code 块专用
  wrap: boolean,                  // ✗ Code 块专用
  indentation_level: string,      // ✗ Text 块专用
}
```

## 代码示例对比

### 创建居中对齐的 Text 块

```javascript
{
  block_type: 2,
  text: {
    style: {
      align: 2,  // 居中
      background_color: "LightBlueBackground"
    },
    elements: [
      { text_run: { content: "这是一段居中的文本" } }
    ]
  }
}
```

### 创建居中对齐的 Heading1 块

```javascript
{
  block_type: 3,
  heading1: {
    style: {
      align: 2,  // 居中
      background_color: "LightBlueBackground"
    },
    elements: [
      { text_run: { content: "这是一个居中的标题" } }
    ]
  }
}
```

## 关键发现

1. **Style 定义完全一致**: Text 和 Heading1 使用相同的 `text_style` 类型定义

2. **统一的 Style 系统**: 飞书文档使用统一的 style 系统，适用于所有文本类块（Text, Heading1~9, Bullet, Ordered, Code, Quote, Todo）

3. **属性复用**: 某些 style 属性仅在特定块类型中有效：
   - `indentation_level`: 仅 Text 块使用
   - `done`: 仅 Todo 块使用
   - `language` / `wrap`: 仅 Code 块使用

4. **通用属性**: 以下属性适用于大多数文本块：
   - `align`: 对齐方式
   - `folded`: 折叠状态
   - `background_color`: 背景色

## 建议

### 工具定义时的处理

```typescript
// 定义通用的 style schema
const baseStyleSchema = z.object({
  align: z.number().int().min(1).max(3).optional(),
  folded: z.boolean().optional(),
  background_color: z.enum([
    "LightGrayBackground",
    "LightRedBackground",
    // ... 其他颜色
  ]).optional(),
});

// Text 块 style
const textStyleSchema = baseStyleSchema.extend({
  indentation_level: z.enum(["NoIndent", "OneLevelIndent"]).optional(),
});

// Heading1 块 style（与 base 相同）
const headingStyleSchema = baseStyleSchema;

// Code 块 style
const codeStyleSchema = baseStyleSchema.extend({
  language: z.number().int().min(1).max(75).optional(),
  wrap: z.boolean().optional(),
});

// Todo 块 style
const todoStyleSchema = baseStyleSchema.extend({
  done: z.boolean().optional(),
});
```

### 最佳实践

1. **复用 style 定义**: 为不同块类型共享基础 style schema
2. **文档化差异**: 明确说明哪些 style 属性在特定块类型中有效
3. **运行时验证**: 创建块时只传入该块类型实际使用的 style 属性
4. **类型安全**: 使用 TypeScript 确保 style 属性使用正确

## 总结

Text 块和 Heading1 块的 `style` 属性在 API 定义层面**完全相同**，区别仅在于：

- **Text 块**: 可以使用 `indentation_level` 属性进行缩进控制
- **Heading1 块**: `indentation_level` 属性无效（标题不支持缩进）

其他所有 style 属性（align, folded, background_color）在两种块类型中的行为完全一致。
