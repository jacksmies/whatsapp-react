import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOllamaChat } from "../../../lib/ollama";
import { POST } from "./route";

vi.mock("../../../lib/ollama", () => ({
  requestOllamaChat: vi.fn(),
}));

const requestOllamaChatMock = vi.mocked(requestOllamaChat);

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

  it("returns the assistant message from Ollama", async () => {
    requestOllamaChatMock.mockResolvedValue({
      role: "assistant",
      content: "Hello from the model",
    });

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "hello" }],
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
      messages: [{ role: "user", content: "hello" }],
    });
  });
});
