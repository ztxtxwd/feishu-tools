# Unit Test Template

测试文件位置：`tests/unit/tools/<module>/<category>/<tool-name>.test.ts`

## SDK-based Tool 测试模板

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { <toolName> } from "@/tools/<module>/<category>/<tool-name>.js";

describe("<toolName>", () => {
  // Mock client
  const mockMethod = vi.fn();
  const mockClient = {
    <module>: {
      <api>: {
        <method>: mockMethod,
      },
    },
  } as unknown as import("@larksuiteoapi/node-sdk").Client;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(<toolName>.name).toBe("<snake_case_name>");
    });

    it("should have description", () => {
      expect(<toolName>.description).toBeDefined();
    });

    it("should have inputSchema", () => {
      expect(<toolName>.inputSchema).toBeDefined();
    });
  });

  describe("context validation", () => {
    it("should return error when client is not provided", async () => {
      const result = await <toolName>.callback({}, { /* args */ });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Feishu client is required");
    });
  });

  describe("successful calls", () => {
    it("should call SDK with correct parameters", async () => {
      mockMethod.mockResolvedValue({
        code: 0,
        data: { /* expected data */ },
      });

      const result = await <toolName>.callback(
        { client: mockClient },
        { /* args */ }
      );

      expect(result.isError).toBeUndefined();
      expect(mockMethod).toHaveBeenCalledWith({
        path: { /* path params */ },
        params: { /* query params - cleaned */ },
        data: { /* body */ },
      });
    });

    it("should not include undefined optional params", async () => {
      mockMethod.mockResolvedValue({ code: 0, data: {} });

      await <toolName>.callback(
        { client: mockClient },
        { requiredParam: "value" } // 不传可选参数
      );

      // 验证 cleanParams 生效：undefined 参数不应出现
      expect(mockMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.not.objectContaining({ optionalParam: undefined }),
        })
      );
    });
  });

  describe("error handling", () => {
    it("should handle API error", async () => {
      mockMethod.mockResolvedValue({
        code: 1001,
        msg: "Some error",
      });

      const result = await <toolName>.callback(
        { client: mockClient },
        { /* args */ }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Some error");
    });

    it("should handle rate limit error", async () => {
      mockMethod.mockResolvedValue({
        code: 99991400,
        msg: "rate limit exceeded",
      });

      const result = await <toolName>.callback(
        { client: mockClient },
        { /* args */ }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("频率限制");
    });

    it("should handle exception", async () => {
      mockMethod.mockRejectedValue(new Error("Network error"));

      const result = await <toolName>.callback(
        { client: mockClient },
        { /* args */ }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Network error");
    });
  });
});
```

## HTTP Request Tool 测试模板

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { <toolName> } from "@/tools/<module>/<category>/<tool-name>.js";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("<toolName>", () => {
  const mockGetTenantAccessToken = vi.fn().mockResolvedValue("test-tat");
  const mockGetUserAccessToken = vi.fn().mockResolvedValue(null);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("token validation", () => {
    it("should return error when no token available", async () => {
      const result = await <toolName>.callback(
        {
          getTenantAccessToken: async () => null,
          getUserAccessToken: async () => null,
        },
        { /* args */ }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Access token is required");
    });
  });

  describe("successful calls", () => {
    it("should call API with correct URL and headers", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ code: 0, data: { id: "123" } }),
      });

      await <toolName>.callback(
        { getTenantAccessToken: mockGetTenantAccessToken },
        { resourceId: "abc" }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/abc"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-tat",
          }),
        })
      );
    });
  });

  // ... error handling tests same as above
});
```
