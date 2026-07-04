import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOllamaPayload, requestOllamaChat } from "./ollama";

describe("buildOllamaPayload", () => {
  it("keeps only supported message roles and trims content", () => {
    expect(
      buildOllamaPayload({
        model: "llama3.2",
        messages: [
          { role: "user", content: "  hello  " },
          { role: "assistant", content: "hi" },
        ],
      }),
    ).toEqual({
      model: "llama3.2",
      stream: false,
      messages: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ],
    });
  });

  it("throws when messages are missing", () => {
    expect(() =>
      buildOllamaPayload({ model: "llama3.2", messages: [] }),
    ).toThrow("At least one message is required.");
  });
});

describe("requestOllamaChat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts a non-streaming chat request to Ollama", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: { role: "assistant", content: "Hello from Ollama" },
        }),
      ),
    );

    await expect(
      requestOllamaChat({
        model: "llama3.2",
        messages: [{ role: "user", content: "hello" }],
      }),
    ).resolves.toEqual({ role: "assistant", content: "Hello from Ollama" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2",
          stream: false,
          messages: [{ role: "user", content: "hello" }],
        }),
      }),
    );
  });
});
