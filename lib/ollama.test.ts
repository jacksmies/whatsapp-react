import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOllamaPayload,
  requestOllamaChat,
  requestOllamaChatWithTools,
} from "./ollama";

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
      keep_alive: -1,
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

  it("rejects invalid chat payloads before forwarding", () => {
    expect(() =>
      buildOllamaPayload({
        model: "llama3.2",
        messages: [{ role: "user", content: "   " }],
      }),
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
          keep_alive: -1,
          stream: false,
          messages: [{ role: "user", content: "hello" }],
        }),
      }),
    );
  });

  it("reports unreachable Ollama responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("model not found", { status: 404 }),
    );

    await expect(
      requestOllamaChat({
        model: "llama3.2",
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow("model not found");
  });
});

describe("requestOllamaChatWithTools", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("executes model-requested tools and sends tool results back to Ollama", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  type: "function",
                  function: {
                    name: "list_course_availability",
                    arguments: { courseTitle: "public speaking" },
                  },
                },
              ],
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: {
              role: "assistant",
              content: "The public speaking course has 8 seats available.",
            },
          }),
        ),
      );

    const execute = vi.fn().mockResolvedValue([
      {
        title: "Public Speaking Course",
        startDate: "2026-08-15",
        availability: 8,
      },
    ]);

    await expect(
      requestOllamaChatWithTools({
        model: "qwen3",
        messages: [{ role: "user", content: "When is public speaking open?" }],
        tools: [
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
            execute,
          },
        ],
      }),
    ).resolves.toEqual({
      role: "assistant",
      content: "The public speaking course has 8 seats available.",
    });

    expect(execute).toHaveBeenCalledWith({ courseTitle: "public speaking" });
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      model: "qwen3",
      keep_alive: -1,
      stream: false,
      messages: [{ role: "user", content: "When is public speaking open?" }],
      tools: [
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
        },
      ],
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      model: "qwen3",
      keep_alive: -1,
      stream: false,
      messages: [
        { role: "user", content: "When is public speaking open?" },
        {
          role: "assistant",
          tool_calls: [
            {
              type: "function",
              function: {
                name: "list_course_availability",
                arguments: { courseTitle: "public speaking" },
              },
            },
          ],
        },
        {
          role: "tool",
          tool_name: "list_course_availability",
          content:
            '[{"title":"Public Speaking Course","startDate":"2026-08-15","availability":8}]',
        },
      ],
      tools: [
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
        },
      ],
    });
  });
});
