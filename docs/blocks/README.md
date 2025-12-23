# 飞书文档块类型 API 文档

本目录包含飞书文档创建块 API 的拆分文档，每种块类型都有独立的文档文件。

## 文档说明

原始的 `创建块.md` 文档（639KB+）包含了所有 50+ 种块类型的完整定义，由于文件过大不便于使用。本目录通过 `split-blocks-doc.js` 脚本将其拆分为每种块类型的单独文档，方便查阅和使用。

## 块类型列表

| 块类型编号 | 块类型名称 | 文档文件 | 说明 |
|-----------|-----------|---------|------|
| 1 | page | - | 页面块（文档根节点） |
| 2 | text | create-text-block.md | 文本块 |
| 3 | heading1 | create-heading1-block.md | 一级标题 |
| 4 | heading2 | create-heading2-block.md | 二级标题 |
| 5 | heading3 | create-heading3-block.md | 三级标题 |
| 6 | heading4 | create-heading4-block.md | 四级标题 |
| 7 | heading5 | create-heading5-block.md | 五级标题 |
| 8 | heading6 | create-heading6-block.md | 六级标题 |
| 9 | heading7 | create-heading7-block.md | 七级标题 |
| 10 | heading8 | create-heading8-block.md | 八级标题 |
| 11 | heading9 | create-heading9-block.md | 九级标题 |
| 12 | bullet | create-bullet-block.md | 无序列表 |
| 13 | ordered | create-ordered-block.md | 有序列表 |
| 14 | code | create-code-block.md | 代码块 |
| 15 | quote | create-quote-block.md | 引用块 |
| 16 | equation | create-equation-block.md | 公式块 |
| 17 | todo | create-todo-block.md | 待办事项 |
| 18 | bitable | create-bitable-block.md | 多维表格 |
| 19 | callout | create-callout-block.md | 高亮块 |
| 20 | chat_card | create-chat_card-block.md | 群聊卡片 |
| 21 | diagram | - | 流程图/UML |
| 22 | divider | create-divider-block.md | 分割线 |
| 23 | file | create-file-block.md | 文件块 |
| 24 | grid | create-grid-block.md | 分栏 |
| 25 | grid_column | - | 分栏列 |
| 26 | iframe | create-iframe-block.md | 内嵌网页 |
| 27 | image | create-image-block.md | 图片 |
| 28 | isv | create-isv-block.md | 开放平台小组件 |
| 29 | mindnote | - | 思维笔记 |
| 30 | sheet | create-sheet-block.md | 电子表格 |
| 31 | table | create-table-block.md | 表格 |
| 32 | table_cell | - | 表格单元格 |
| 33 | view | - | 视图 |
| 34 | quote_container | create-quote_container-block.md | 引用容器 |
| 35 | task | create-task-block.md | 任务 |
| 36 | okr | create-okr-block.md | OKR |
| 37 | okr_objective | - | OKR Objective |
| 38 | okr_key_result | - | OKR Key Result |
| 39 | okr_progress | - | OKR 进展 |
| 40 | widget | - | 文档小组件 |
| 41 | jira | - | Jira 问题 |
| 42 | wiki_catalog | create-wiki_catalog-block.md | Wiki 子目录 |
| 43 | board | create-board-block.md | 画板 |
| 44 | agenda | - | 议程 |
| 45 | agenda_item | - | 议程项 |
| 46 | agenda_item_title | - | 议程项标题 |
| 47 | agenda_item_content | - | 议程项内容 |
| 48 | link_preview | create-link_preview-block.md | 链接预览 |
| 49 | sync_block | - | 源同步块（仅支持查询） |
| 50 | reference_sync_block | - | 引用同步块（仅支持查询） |
| 51 | wiki_catalog_new | - | Wiki 新版子目录 |
| 52 | ai_template | create-ai_template-block.md | AI 模板块（仅支持查询） |
| 999 | undefined | - | 未支持块 |

## 使用方法

1. 根据需要创建的块类型，查找对应的 block_type 编号
2. 打开对应的文档文件，查看该块类型的完整请求参数和响应结构
3. 参考文档中的示例进行 API 调用

## 文档结构

每个块类型文档包含：

- **API 概述**：接口说明、频率限制等
- **前提条件**：权限要求
- **请求部分**：
  - 请求头
  - 路径参数
  - 查询参数
  - 请求体（包含该块类型的特定字段）
- **响应部分**：响应体结构和字段说明

## 重新生成文档

如果原始文档更新，可以运行以下命令重新拆分：

```bash
node split-blocks-doc.js
```

## 参考资料

- [飞书开放平台 - 文档 API](https://open.feishu.cn/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/document-docx/docx-overview)
- [创建块 API](https://open.feishu.cn/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/document-docx/docx-v1/document-block-children/create)
