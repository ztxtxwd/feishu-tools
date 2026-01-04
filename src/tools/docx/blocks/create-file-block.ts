import { z } from "zod";
import { defineTool } from "../../../define-tool.js";
import { resolveToken } from "../../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";
import * as fs from "fs";
import * as path from "path";

/**
 * 计算 Adler-32 校验和
 */
function adler32(data: Buffer): number {
  const MOD_ADLER = 65521;
  let a = 1;
  let b = 0;

  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }

  return (b << 16) | a;
}

/**
 * 创建文件块
 *
 * 完成文件块的创建需要三个步骤：
 * 1. 创建空的文件块
 * 2. 上传文件素材到该文件块
 * 3. 更新块内容，设置 file_token
 *
 * 此工具一次性完成所有步骤
 */
export const createFileBlock = defineTool({
  name: "create_file_or_video_block",
  description: {
    summary:
      "在飞书文档中创建文件块或视频块。支持通过本地文件路径或 Base64 编码内容上传文件/视频。",
    bestFor:
      "在文档中插入附件文件、上传视频到文档、上传本地文件到文档、将文件或视频嵌入文档",
    notRecommendedFor:
      "上传图片（请使用 create_image_block）、创建不含文件的占位块",
  },
  inputSchema: {
    document_id: z
      .string()
      .describe("文档的唯一标识（document_id）"),
    block_id: z
      .string()
      .describe("父块的 block_id，文件块将创建在此块下"),
    index: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("插入位置索引，不传则追加到末尾"),
    file_path: z
      .string()
      .optional()
      .describe("本地文件的绝对路径。与 file_content 二选一"),
    file_content: z
      .string()
      .optional()
      .describe(
        "文件内容的 Base64 编码字符串。与 file_path 二选一。适用于内存中的文件数据"
      ),
    file_name: z
      .string()
      .optional()
      .describe(
        "文件名称（包含扩展名）。使用 file_path 时可省略，将自动从路径提取"
      ),
    view_type: z
      .enum(["card", "preview"])
      .optional()
      .describe("文件显示方式：card=卡片视图（默认），preview=预览视图"),
    document_revision_id: z
      .number()
      .int()
      .optional()
      .describe("文档版本，-1 表示最新版本"),
  },
  outputSchema: {
    view_block_id: z.string().describe("视图块的 block_id"),
    file_block_id: z.string().describe("文件块的 block_id"),
    file_token: z.string().describe("上传后的文件 token"),
    file_name: z.string().describe("文件名称"),
  },
  callback: async (context, args) => {
    if (!context.client) {
      return {
        content: [
          { type: "text" as const, text: "Error: Feishu client is required" },
        ],
        isError: true,
      };
    }

    // 验证输入参数
    if (!args.file_path && !args.file_content) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Either file_path or file_content must be provided",
          },
        ],
        isError: true,
      };
    }

    if (args.file_path && args.file_content) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Only one of file_path or file_content should be provided, not both",
          },
        ],
        isError: true,
      };
    }

    try {
      const userAccessToken = await resolveToken(context.getUserAccessToken);
      const requestOptions = userAccessToken
        ? lark.withUserAccessToken(userAccessToken)
        : undefined;

      // 准备文件数据
      let fileBuffer: Buffer;
      let fileName: string;

      if (args.file_path) {
        // 从文件路径读取
        if (!fs.existsSync(args.file_path)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: File not found: ${args.file_path}`,
              },
            ],
            isError: true,
          };
        }
        fileBuffer = fs.readFileSync(args.file_path);
        fileName = args.file_name || path.basename(args.file_path);
      } else {
        // 从 Base64 内容解码
        if (!args.file_name) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: file_name is required when using file_content",
              },
            ],
            isError: true,
          };
        }
        fileBuffer = Buffer.from(args.file_content!, "base64");
        fileName = args.file_name;
      }

      const fileSize = fileBuffer.length;
      const checksum = adler32(fileBuffer).toString();

      // 检查文件大小限制（20MB）
      const MAX_FILE_SIZE = 20 * 1024 * 1024;
      if (fileSize > MAX_FILE_SIZE) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: File size (${fileSize} bytes) exceeds the limit of 20MB. Please use chunked upload for larger files.`,
            },
          ],
          isError: true,
        };
      }

      // Step 1: 创建空的文件块
      const createBlockResponse =
        await context.client.docx.v1.documentBlockChildren.create(
          {
            path: {
              document_id: args.document_id,
              block_id: args.block_id,
            },
            params: {
              document_revision_id: args.document_revision_id ?? -1,
            },
            data: {
              index: args.index,
              children: [
                {
                  block_type: 23, // file block type
                  file: {
                    view_type: 1, // 卡片视图
                  },
                } as unknown as { block_type: number; file: { view_type?: number } },
              ],
            },
          },
          requestOptions
        );

      if (createBlockResponse.code !== 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating file block: ${createBlockResponse.msg || createBlockResponse.code}`,
            },
          ],
          isError: true,
        };
      }

      // 从响应中提取 View Block 和 File Block ID
      const children = createBlockResponse.data?.children;
      if (!children || children.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No blocks returned from create block API",
            },
          ],
          isError: true,
        };
      }

      // 文件块创建后返回的是 View Block，其 children 中包含 File Block
      const viewBlock = children[0];
      const viewBlockId = viewBlock.block_id!;
      const fileBlockId = viewBlock.children?.[0];

      if (!fileBlockId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: File block ID not found in response",
            },
          ],
          isError: true,
        };
      }

      // Step 2: 上传文件素材
      const uploadResponse = await context.client.drive.v1.media.uploadAll(
        {
          data: {
            file_name: fileName,
            parent_type: "docx_file",
            parent_node: fileBlockId,
            size: fileSize,
            checksum: checksum,
            file: fileBuffer,
          },
        },
        requestOptions
      );

      if (!uploadResponse) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No response from upload API",
            },
          ],
          isError: true,
        };
      }

      // uploadAll 返回的是 { file_token?: string } 类型
      const fileToken = uploadResponse.file_token;
      if (!fileToken) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: File token not returned from upload API",
            },
          ],
          isError: true,
        };
      }

      // Step 3: 更新文件块，设置 file_token
      const patchResponse = await context.client.docx.v1.documentBlock.patch(
        {
          path: {
            document_id: args.document_id,
            block_id: fileBlockId,
          },
          params: {
            document_revision_id: -1, // 使用最新版本
          },
          data: {
            replace_file: {
              token: fileToken,
            },
          },
        },
        requestOptions
      );

      if (patchResponse.code !== 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error updating file block: ${patchResponse.msg || patchResponse.code}`,
            },
          ],
          isError: true,
        };
      }

      const result = {
        view_block_id: viewBlockId,
        file_block_id: fileBlockId,
        file_token: fileToken,
        file_name: fileName,
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
        structuredContent: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
});
