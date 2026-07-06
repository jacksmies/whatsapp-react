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
    vi.unstubAllEnvs();
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
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("model not found", { status: 404 }),
    );

    await expect(
      requestOllamaChat({
        model: "llama3.2",
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow("model not found");
    expect(errorSpy).toHaveBeenCalledWith(
      "[ollama-tools] provider-error",
      expect.objectContaining({
        status: 404,
        responseBody: "model not found",
      }),
    );
  });

  it("uses a configured model base URL and bearer API key", async () => {
    vi.stubEnv("MODEL_BASE_URL", "https://models.example.com/api/chat");
    vi.stubEnv("MODEL_API_KEY", "test-api-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: { role: "assistant", content: "Hello from cloud" },
        }),
      ),
    );

    await requestOllamaChat({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://models.example.com/api/chat",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        },
      }),
    );
  });

  it("logs token usage when the provider returns usage metadata", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: { role: "assistant", content: "Hello with usage" },
          usage: {
            prompt_tokens: 12,
            completion_tokens: 7,
            total_tokens: 19,
          },
        }),
      ),
    );

    await requestOllamaChat({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(logSpy).toHaveBeenCalledWith("[ollama-tools] usage", {
      promptTokens: 12,
      completionTokens: 7,
      totalTokens: 19,
    });
  });

  it("posts OpenAI Responses payloads to Groq-compatible /responses endpoints", async () => {
    vi.stubEnv("MODEL_BASE_URL", "https://api.groq.com/openai/v1");
    vi.stubEnv("MODEL_API_KEY", "groq-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: "Fast models matter because they reduce latency.",
          usage: {
            input_tokens: 11,
            output_tokens: 8,
            total_tokens: 19,
          },
        }),
      ),
    );

    await expect(
      requestOllamaChatWithTools({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: "Explain fast models" }],
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
            execute: vi.fn(),
          },
        ],
      }),
    ).resolves.toEqual({
      role: "assistant",
      content: "Fast models matter because they reduce latency.",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer groq-key",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          input: [{ role: "user", content: "Explain fast models" }],
          tools: [
            {
              type: "function",
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
          ],
        }),
      }),
    );
  });

  it("can opt into Responses reasoning effort and logs reasoning separately", async () => {
    vi.stubEnv("MODEL_BASE_URL", "https://api.groq.com/openai/v1");
    vi.stubEnv("MODEL_REASONING_EFFORT", "low");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              type: "reasoning",
              summary: [
                {
                  type: "summary_text",
                  text: "The user greeted us, so answer briefly.",
                },
              ],
            },
            {
              type: "message",
              content: [{ type: "output_text", text: "Hi there!" }],
            },
          ],
        }),
      ),
    );

    await expect(
      requestOllamaChatWithTools({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: "Hello" }],
        tools: [],
      }),
    ).resolves.toEqual({
      role: "assistant",
      content: "Hi there!",
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      model: "openai/gpt-oss-20b",
      reasoning: { effort: "low" },
      input: [{ role: "user", content: "Hello" }],
    });
    expect(logSpy).toHaveBeenCalledWith("[ollama-tools] reasoning", {
      content: "The user greeted us, so answer briefly.",
    });
  });

  it("sends Responses tool outputs without previous_response_id for Groq", async () => {
    vi.stubEnv("MODEL_BASE_URL", "https://api.groq.com/openai/v1");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "response-1",
            output: [
              {
                type: "function_call",
                name: "list_course_availability",
                call_id: "call-1",
                arguments: JSON.stringify({ courseTitle: "public speaking" }),
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output_text: "Public speaking has 8 seats available.",
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
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: "Any public speaking seats?" }],
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
      content: "Public speaking has 8 seats available.",
    });

    expect(execute).toHaveBeenCalledWith({ courseTitle: "public speaking" });
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      model: "openai/gpt-oss-20b",
      input: [
        { role: "user", content: "Any public speaking seats?" },
        {
          type: "function_call",
          name: "list_course_availability",
          call_id: "call-1",
          arguments: JSON.stringify({ courseTitle: "public speaking" }),
        },
        {
          type: "function_call_output",
          call_id: "call-1",
          output:
            '[{"title":"Public Speaking Course","startDate":"2026-08-15","availability":8}]',
        },
      ],
      tools: [
        {
          type: "function",
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
      ],
    });
  });
});

describe("requestOllamaChatWithTools", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
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
