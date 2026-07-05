import { afterEach, describe, expect, it, vi } from "vitest";
import { saveMessage } from "../../../lib/chat-repository";
import { requestOllamaChat } from "../../../lib/ollama";
import { POST } from "./route";

vi.mock("../../../lib/ollama", () => ({
  requestOllamaChat: vi.fn(),
}));

vi.mock("../../../lib/chat-repository", () => ({
  saveMessage: vi.fn(),
}));

const requestOllamaChatMock = vi.mocked(requestOllamaChat);
const saveMessageMock = vi.mocked(saveMessage);

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.resetAllMocks();
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
    requestOllamaChatMock.mockResolvedValue({
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
    expect(requestOllamaChatMock).toHaveBeenCalledWith({
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
    });
    expect(requestOllamaChatMock).toHaveBeenCalledWith({
      model: "llama3.2",
      messages: expect.arrayContaining([
        {
          role: "system",
          content: expect.stringContaining("Customer question:\nhello"),
        },
      ]),
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
    expect(requestOllamaChatMock).not.toHaveBeenCalled();
    expect(saveMessageMock).not.toHaveBeenCalled();
  });
});
