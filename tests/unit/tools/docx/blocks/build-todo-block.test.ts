import { describe, it, expect } from "vitest";
import { buildTodoBlock } from "../../../../../src/tools/docx/blocks/build-todo-block.js";

describe("buildTodoBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildTodoBlock.name).toBe("build_todo_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildTodoBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildTodoBlock.description).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build todo block with correct block_type", async () => {
      const result = await buildTodoBlock.callback(context, {
        elements: [{ text_run: { content: "Task to do" } }],
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 17,
        todo: {
          elements: [{ text_run: { content: "Task to do" } }],
        },
      });
    });

    it("should build todo block with done status", async () => {
      const result = await buildTodoBlock.callback(context, {
        elements: [{ text_run: { content: "Completed task" } }],
        style: { done: true },
      });

      expect(result.structuredContent).toEqual({
        block_type: 17,
        todo: {
          elements: [{ text_run: { content: "Completed task" } }],
          style: { done: true },
        },
      });
    });

    it("should build todo block with done=false", async () => {
      const result = await buildTodoBlock.callback(context, {
        elements: [{ text_run: { content: "Pending task" } }],
        style: { done: false },
      });

      expect(result.structuredContent.todo.style).toEqual({
        done: false,
      });
    });

    it("should build todo block with folded and done", async () => {
      const result = await buildTodoBlock.callback(context, {
        elements: [{ text_run: { content: "Task with children" } }],
        style: { done: true, folded: true },
      });

      expect(result.structuredContent.todo.style).toEqual({
        done: true,
        folded: true,
      });
    });

    it("should build todo block with all style options", async () => {
      const result = await buildTodoBlock.callback(context, {
        elements: [{ text_run: { content: "Styled task" } }],
        style: {
          align: 1,
          done: false,
          folded: false,
          background_color: "LightYellowBackground",
        },
      });

      expect(result.structuredContent.todo.style).toEqual({
        align: 1,
        done: false,
        folded: false,
        background_color: "LightYellowBackground",
      });
    });

    it("should build todo block with rich text elements", async () => {
      const result = await buildTodoBlock.callback(context, {
        elements: [
          { text_run: { content: "Review PR from " } },
          { mention_user: { user_id: "ou_abc123" } },
        ],
      });

      expect(result.structuredContent.todo.elements).toHaveLength(2);
    });

    it("should build todo block with reminder", async () => {
      const result = await buildTodoBlock.callback(context, {
        elements: [
          { text_run: { content: "Meeting " } },
          {
            reminder: {
              create_user_id: "ou_abc123",
              expire_time: "1641967200000",
              notify_time: "1643166000000",
            },
          },
        ],
      });

      expect(result.structuredContent.todo.elements).toHaveLength(2);
      expect(result.structuredContent.todo.elements[1].reminder).toBeDefined();
    });

    it("should return JSON string in content", async () => {
      const result = await buildTodoBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(17);
    });

    it("should not include style when not provided", async () => {
      const result = await buildTodoBlock.callback(context, {
        elements: [{ text_run: { content: "test" } }],
      });

      expect(result.structuredContent.todo).not.toHaveProperty("style");
    });
  });
});
