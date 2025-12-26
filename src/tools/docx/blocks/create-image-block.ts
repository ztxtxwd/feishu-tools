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
 * 创建图片块
 *
 * 完成图片块的创建需要三个步骤：
 * 1. 创建空的图片块
 * 2. 上传图片素材到该图片块
 * 3. 更新块内容，设置 image_token
 *
 * 此工具一次性完成所有步骤
 */
export const createImageBlock = defineTool({
  name: "create_image_block",
  description: {
    summary:
      "在飞书文档中创建图片块。支持通过本地图片路径或 Base64 编码内容上传图片。",
    bestFor:
      "在文档中插入图片、上传本地图片到文档、将图片嵌入文档",
    notRecommendedFor:
      "上传附件文件（请使用 create_file_block）、创建不含图片的占位块",
  },
  inputSchema: {
    document_id: z
      .string()
      .describe("文档的唯一标识（document_id）"),
    block_id: z
      .string()
      .describe("父块的 block_id，图片块将创建在此块下"),
    index: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("插入位置索引，不传则追加到末尾"),
    image_path: z
      .string()
      .optional()
      .describe("本地图片文件的绝对路径。与 image_content 二选一"),
    image_content: z
      .string()
      .optional()
      .describe(
        "图片内容的 Base64 编码字符串。与 image_path 二选一。适用于内存中的图片数据"
      ),
    file_name: z
      .string()
      .optional()
      .describe(
        "图片文件名称（包含扩展名）。使用 image_path 时可省略，将自动从路径提取"
      ),
    align: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional()
      .default(2)
      .describe("对齐方式：1=居左，2=居中（默认），3=居右"),
    caption: z
      .string()
      .optional()
      .describe("图片描述文本（可选）"),
    document_revision_id: z
      .number()
      .int()
      .optional()
      .default(-1)
      .describe("文档版本，-1 表示最新版本"),
  },
  outputSchema: {
    image_block_id: z.string().describe("图片块的 block_id"),
    image_token: z.string().describe("上传后的图片 token"),
    file_name: z.string().describe("图片文件名称"),
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
    if (!args.image_path && !args.image_content) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Either image_path or image_content must be provided",
          },
        ],
        isError: true,
      };
    }

    if (args.image_path && args.image_content) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Only one of image_path or image_content should be provided, not both",
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

      // 准备图片数据
      let imageBuffer: Buffer;
      let fileName: string;

      if (args.image_path) {
        // 从文件路径读取
        if (!fs.existsSync(args.image_path)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Image file not found: ${args.image_path}`,
              },
            ],
            isError: true,
          };
        }
        imageBuffer = fs.readFileSync(args.image_path);
        fileName = args.file_name || path.basename(args.image_path);
      } else {
        // 从 Base64 内容解码
        if (!args.file_name) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: file_name is required when using image_content",
              },
            ],
            isError: true,
          };
        }
        imageBuffer = Buffer.from(args.image_content!, "base64");
        fileName = args.file_name;
      }

      const fileSize = imageBuffer.length;
      const checksum = adler32(imageBuffer).toString();

      // 检查文件大小限制（20MB）
      const MAX_FILE_SIZE = 20 * 1024 * 1024;
      if (fileSize > MAX_FILE_SIZE) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Image file size (${fileSize} bytes) exceeds the limit of 20MB.`,
            },
          ],
          isError: true,
        };
      }

      // Step 1: 创建空的图片块
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
                  block_type: 27, // image block type
                  image: {
                    align: args.align ?? 2,
                  },
                } as unknown as { block_type: number; image: { align?: number } },
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
              text: `Error creating image block: ${createBlockResponse.msg || createBlockResponse.code}`,
            },
          ],
          isError: true,
        };
      }

      // 从响应中提取 Image Block ID
      // 注意：与 File Block 不同，创建 Image Block 时直接返回 Image Block，没有 View Block 包裹
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

      // 图片块创建后直接返回 Image Block
      const imageBlock = children[0];
      const imageBlockId = imageBlock.block_id!;

      if (!imageBlockId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Image block ID not found in response",
            },
          ],
          isError: true,
        };
      }

      // Step 2: 上传图片素材
      const uploadResponse = await context.client.drive.v1.media.uploadAll(
        {
          data: {
            file_name: fileName,
            parent_type: "docx_image",
            parent_node: imageBlockId,
            size: fileSize,
            checksum: checksum,
            file: imageBuffer,
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
      const imageToken = uploadResponse.file_token;
      if (!imageToken) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Image token not returned from upload API",
            },
          ],
          isError: true,
        };
      }

      // Step 3: 更新图片块，设置 image_token 和其他属性
      const updateData: {
        replace_image: { token: string };
        update_text_elements?: { elements: Array<{ text_run: { content: string } }> };
      } = {
        replace_image: {
          token: imageToken,
        },
      };

      // 如果有 caption，添加到更新数据中
      if (args.caption) {
        updateData.update_text_elements = {
          elements: [
            {
              text_run: {
                content: args.caption,
              },
            },
          ],
        };
      }

      const patchResponse = await context.client.docx.v1.documentBlock.patch(
        {
          path: {
            document_id: args.document_id,
            block_id: imageBlockId,
          },
          params: {
            document_revision_id: -1, // 使用最新版本
          },
          data: updateData,
        },
        requestOptions
      );

      if (patchResponse.code !== 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error updating image block: ${patchResponse.msg || patchResponse.code}`,
            },
          ],
          isError: true,
        };
      }

      const result = {
        image_block_id: imageBlockId,
        image_token: imageToken,
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
