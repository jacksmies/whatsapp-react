import { afterEach, describe, expect, it, vi } from "vitest";
import { saveMessage } from "../../../lib/chat-repository";
import { requestOllamaChatWithTools } from "../../../lib/ollama";
import { academyTools } from "../../../lib/tools/registry";
import { POST } from "./route";

vi.mock("../../../lib/ollama", () => ({
  requestOllamaChatWithTools: vi.fn(),
}));

vi.mock("../../../lib/tools/registry", () => ({
  academyTools: [
    {
      type: "function",
      function: {
        name: "list_course_availability",
        description: "List available course dates.",
        parameters: {
          type: "object",
          required: ["courseTitle"],
          properties: {
            courseTitle: { type: "string" },
          },
        },
      },
      execute: vi.fn(),
    },
  ],
}));

vi.mock("../../../lib/chat-repository", () => ({
  saveMessage: vi.fn(),
}));

const requestOllamaChatWithToolsMock = vi.mocked(requestOllamaChatWithTools);
const saveMessageMock = vi.mocked(saveMessage);

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 400 when the body is not valid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: "{",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON body.",
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when messages are missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Request body must include a messages array.",
    });
    expect(response.status).toBe(400);
  });

  it("returns the assistant message from Ollama after adding academy knowledge and memory", async () => {
    requestOllamaChatWithToolsMock.mockResolvedValue({
      role: "assistant",
      content: "Hello from the model",
    });

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          conversationId: "conversation-1",
          messages: [
            { role: "assistant", content: "Hi. Ask me anything." },
            { role: "user", content: "Where are you located?" },
            { role: "assistant", content: "Dubai Knowledge Park." },
            { role: "user", content: "hello" },
          ],
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      message: { role: "assistant", content: "Hello from the model" },
      model: "llama3.2",
    });
    expect(response.status).toBe(200);
    expect(requestOllamaChatWithToolsMock).toHaveBeenCalledWith({
      model: "llama3.2",
      messages: [
        {
          role: "system",
          content: expect.stringContaining("Academy Knowledge Base"),
        },
        { role: "user", content: "Where are you located?" },
        { role: "assistant", content: "Dubai Knowledge Park." },
        { role: "user", content: "hello" },
      ],
      tools: academyTools,
    });
    expect(requestOllamaChatWithToolsMock).toHaveBeenCalledWith({
      model: "llama3.2",
      messages: expect.arrayContaining([
        {
          role: "system",
          content: expect.stringContaining("Customer question:\nhello"),
        },
      ]),
      tools: academyTools,
    });
    expect(saveMessageMock).toHaveBeenNthCalledWith(1, {
      conversationId: "conversation-1",
      role: "user",
      content: "hello",
    });
    expect(saveMessageMock).toHaveBeenNthCalledWith(2, {
      conversationId: "conversation-1",
      role: "assistant",
      content: "Hello from the model",
    });
  });

  it("uses MODEL_NAME for the requested model when configured", async () => {
    vi.stubEnv("MODEL_NAME", "gpt-4.1-mini");
    requestOllamaChatWithToolsMock.mockResolvedValue({
      role: "assistant",
      content: "Hello from the configured model",
    });

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          conversationId: "conversation-1",
          messages: [{ role: "user", content: "hello" }],
        }),
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      model: "gpt-4.1-mini",
    });
    expect(requestOllamaChatWithToolsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1-mini",
      }),
    );
  });

  it("returns 400 when conversationId is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "hello" }],
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Request body must include a conversationId.",
    });
    expect(response.status).toBe(400);
    expect(requestOllamaChatWithToolsMock).not.toHaveBeenCalled();
    expect(saveMessageMock).not.toHaveBeenCalled();
  });
});
