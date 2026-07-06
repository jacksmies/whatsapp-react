import {
  getModelApiKey,
  getModelBaseUrl,
  getModelReasoningEffort,
} from "./model-config";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ToolCall = {
  type?: "function";
  function: {
    index?: number;
    name: string;
    arguments?: Record<string, unknown>;
  };
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      required?: string[];
      properties: Record<string, unknown>;
    };
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

type BuildPayloadInput = {
  model: string;
  messages: ChatMessage[];
};

type RequestWithToolsInput = BuildPayloadInput & {
  tools: ToolDefinition[];
  maxToolRounds?: number;
};

type OllamaResponse = {
  message?: {
    role?: string;
    content?: string | null;
    tool_calls?: ToolCall[];
  };
  error?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  usage_metadata?: {
    prompt_token_count?: number;
    candidates_token_count?: number;
    total_token_count?: number;
  };
};

type OpenAIResponsesInput =
  | {
      role: ChatRole;
      content: string;
    }
  | OpenAIResponsesFunctionCall
  | {
      type: "function_call_output";
      call_id: string;
      output: string;
    };

type OpenAIResponsesFunctionCall = {
  type: "function_call";
  name: string;
  arguments?: string;
  call_id: string;
};

type OpenAIResponsesResponse = OllamaResponse & {
  id?: string;
  output_text?: string;
  output?: Array<
    | OpenAIResponsesFunctionCall
    | {
        type?: string;
        summary?: Array<{
          type?: string;
          text?: string;
        }>;
        content?: Array<{
          type?: string;
          text?: string;
        }>;
      }
  >;
  error?:
    | string
    | {
        message?: string;
      };
};

type OllamaRequestMessage =
  | {
      role: ChatRole;
      content: string;
    }
  | {
      role: "assistant";
      tool_calls: ToolCall[];
    }
  | {
      role: "tool";
      tool_name: string;
      content: string;
    };

function isChatRole(role: string): role is ChatRole {
  return role === "system" || role === "user" || role === "assistant";
}

export function buildOllamaPayload({ model, messages }: BuildPayloadInput) {
  const normalizedMessages = messages
    .filter((message) => isChatRole(message.role))
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);

  if (normalizedMessages.length === 0) {
    throw new Error("At least one message is required.");
  }

  return {
    model,
    keep_alive: -1,
    stream: false,
    messages: normalizedMessages,
  };
}

function buildToolSchemas(tools: ToolDefinition[]) {
  return tools.map((tool) => ({
    type: tool.type,
    function: tool.function,
  }));
}

function buildOpenAIResponsesToolSchemas(tools: ToolDefinition[]) {
  return tools.map((tool) => ({
    type: tool.type,
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }));
}

function preview(value: unknown) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);

  if (!text) {
    return "";
  }

  return text.length > 800 ? `${text.slice(0, 800)}...` : text;
}

function logToolDebug(label: string, details: Record<string, unknown>) {
  console.log(`[ollama-tools] ${label}`, details);
}

function logToolError(label: string, details: Record<string, unknown>) {
  console.error(`[ollama-tools] ${label}`, details);
}

function extractTokenUsage(data: OllamaResponse) {
  const promptTokens =
    data.usage?.prompt_tokens ??
    data.usage?.input_tokens ??
    data.usage_metadata?.prompt_token_count ??
    data.prompt_eval_count;
  const completionTokens =
    data.usage?.completion_tokens ??
    data.usage?.output_tokens ??
    data.usage_metadata?.candidates_token_count ??
    data.eval_count;
  const totalTokens =
    data.usage?.total_tokens ??
    data.usage_metadata?.total_token_count ??
    (typeof promptTokens === "number" && typeof completionTokens === "number"
      ? promptTokens + completionTokens
      : undefined);

  if (
    typeof promptTokens !== "number" &&
    typeof completionTokens !== "number" &&
    typeof totalTokens !== "number"
  ) {
    return null;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

function resolveOpenAIResponsesUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");

  if (trimmed.endsWith("/responses")) {
    return trimmed;
  }

  return `${trimmed}/responses`;
}

function shouldUseOpenAIResponses(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");

  return trimmed.endsWith("/responses") || trimmed.endsWith("/v1");
}

function normalizeInitialMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => isChatRole(message.role))
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);
}

function buildOllamaToolPayload({
  model,
  messages,
  tools,
}: {
  model: string;
  messages: OllamaRequestMessage[];
  tools: ToolDefinition[];
}) {
  if (messages.length === 0) {
    throw new Error("At least one message is required.");
  }

  return {
    model,
    keep_alive: -1,
    stream: false,
    messages,
    tools: buildToolSchemas(tools),
  };
}

async function postOllamaPayload(payload: unknown) {
  return postModelPayload(getModelBaseUrl(), payload);
}

async function postModelPayload(url: string, payload: unknown) {
  const apiKey = getModelApiKey();

  logToolDebug("provider-request", {
    url,
    hasApiKey: Boolean(apiKey),
    payload: preview(payload),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    logToolError("provider-error", {
      url,
      status: response.status,
      statusText: response.statusText,
      responseBody: preview(details),
    });
    throw new Error(details || "Ollama request failed.");
  }

  const data = (await response.json()) as OllamaResponse;
  const usage = extractTokenUsage(data);

  if (usage) {
    logToolDebug("usage", usage);
  }

  if (data.error) {
    logToolError("provider-response-error", {
      url,
      error: data.error,
      response: preview(data),
    });
  }

  return data;
}

function buildOpenAIResponsesPayload({
  model,
  input,
  tools,
}: {
  model: string;
  input: OpenAIResponsesInput[];
  tools: ToolDefinition[];
}) {
  const reasoningEffort = getModelReasoningEffort();

  return {
    model,
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    input,
    ...(tools.length > 0
      ? { tools: buildOpenAIResponsesToolSchemas(tools) }
      : {}),
  };
}

function parseOpenAIResponsesContent(data: OpenAIResponsesResponse) {
  const outputText = data.output_text?.trim();

  if (outputText) {
    return outputText;
  }

  return data.output
    ?.flatMap((item) => ("content" in item ? (item.content ?? []) : []))
    .map((content) => content.text?.trim() ?? "")
    .filter((text) => text.length > 0)
    .join("\n")
    .trim();
}

function parseOpenAIResponsesReasoning(data: OpenAIResponsesResponse) {
  return data.output
    ?.flatMap((item) => ("summary" in item ? (item.summary ?? []) : []))
    .map((summary) => summary.text?.trim() ?? "")
    .filter((text) => text.length > 0)
    .join("\n")
    .trim();
}

function parseOpenAIResponsesFunctionCalls(data: OpenAIResponsesResponse) {
  return (
    data.output?.filter(
      (item): item is OpenAIResponsesFunctionCall =>
        item.type === "function_call" &&
        "name" in item &&
        "call_id" in item &&
        typeof item.name === "string" &&
        typeof item.call_id === "string",
    ) ?? []
  );
}

function parseOpenAIResponsesArguments(args: string | undefined) {
  if (!args) {
    return {};
  }

  try {
    const parsed = JSON.parse(args) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function openAIResponsesErrorMessage(data: OpenAIResponsesResponse) {
  const error = data.error as string | { message?: string } | undefined;

  if (typeof error === "string") {
    return error;
  }

  return error?.message;
}

async function requestOpenAIResponsesWithTools({
  model,
  messages,
  tools,
  maxToolRounds = 3,
}: RequestWithToolsInput) {
  const modelBaseUrl = getModelBaseUrl();
  const responsesUrl = resolveOpenAIResponsesUrl(modelBaseUrl);
  const toolMap = new Map(tools.map((tool) => [tool.function.name, tool]));
  const input: OpenAIResponsesInput[] = normalizeInitialMessages(messages);

  logToolDebug("responses-start", {
    model,
    url: responsesUrl,
    tools: tools.map((tool) => tool.function.name),
    messageRoles: input.map((message) => ("role" in message ? message.role : message.type)),
  });

  for (let round = 0; round <= maxToolRounds; round += 1) {
    const data = (await postModelPayload(
      responsesUrl,
      buildOpenAIResponsesPayload({
        model,
        input,
        tools,
      }),
    )) as OpenAIResponsesResponse;
    const functionCalls = parseOpenAIResponsesFunctionCalls(data);

    const reasoning = parseOpenAIResponsesReasoning(data);

    if (reasoning) {
      logToolDebug("reasoning", {
        content: reasoning,
      });
    }

    logToolDebug("responses-response", {
      round,
      content: preview(parseOpenAIResponsesContent(data) ?? ""),
      functionCalls: functionCalls.map((functionCall) => ({
        name: functionCall.name,
        arguments: functionCall.arguments ?? "",
      })),
    });

    if (functionCalls.length === 0) {
      const content = parseOpenAIResponsesContent(data);

      if (!content) {
        throw new Error(
          openAIResponsesErrorMessage(data) ||
            "OpenAI Responses returned an empty response.",
        );
      }

      return {
        role: "assistant" as const,
        content,
      };
    }

    for (const functionCall of functionCalls) {
      input.push(functionCall);

      const tool = toolMap.get(functionCall.name);
      const args = parseOpenAIResponsesArguments(functionCall.arguments);
      const result = tool
        ? await tool.execute(args)
        : { error: `Unknown tool: ${functionCall.name}` };
      const output =
        typeof result === "string" ? result : JSON.stringify(result);

      input.push({
        type: "function_call_output",
        call_id: functionCall.call_id,
        output,
      });
    }
  }

  throw new Error("OpenAI Responses exceeded the maximum number of tool rounds.");
}

export async function requestOllamaChat(input: BuildPayloadInput) {
  if (shouldUseOpenAIResponses(getModelBaseUrl())) {
    return requestOpenAIResponsesWithTools({ ...input, tools: [] });
  }

  const data = await postOllamaPayload(buildOllamaPayload(input));
  const content = data.message?.content?.trim();

  if (!content) {
    throw new Error(data.error || "Ollama returned an empty response.");
  }

  return {
    role: "assistant" as const,
    content,
  };
}

export async function requestOllamaChatWithTools({
  model,
  messages,
  tools,
  maxToolRounds = 3,
}: RequestWithToolsInput) {
  if (shouldUseOpenAIResponses(getModelBaseUrl())) {
    return requestOpenAIResponsesWithTools({
      model,
      messages,
      tools,
      maxToolRounds,
    });
  }

  const toolMap = new Map(tools.map((tool) => [tool.function.name, tool]));
  const requestMessages: OllamaRequestMessage[] = normalizeInitialMessages(messages);

  logToolDebug("start", {
    model,
    tools: tools.map((tool) => tool.function.name),
    messageRoles: requestMessages.map((message) => message.role),
  });

  for (let round = 0; round <= maxToolRounds; round += 1) {
    logToolDebug("request", {
      round,
      messageRoles: requestMessages.map((message) => message.role),
      lastMessage: preview(requestMessages.at(-1)),
    });

    const data = await postOllamaPayload(
      buildOllamaToolPayload({ model, messages: requestMessages, tools }),
    );
    const toolCalls = data.message?.tool_calls ?? [];

    logToolDebug("response", {
      round,
      content: preview(data.message?.content ?? ""),
      toolCalls: toolCalls.map((toolCall) => ({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments ?? {},
      })),
    });

    if (toolCalls.length === 0) {
      const content = data.message?.content?.trim();

      if (!content) {
        throw new Error(data.error || "Ollama returned an empty response.");
      }

      logToolDebug("final", {
        round,
        content: preview(content),
      });

      return {
        role: "assistant" as const,
        content,
      };
    }

    requestMessages.push({
      role: "assistant",
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      const tool = toolMap.get(toolName);
      const args = toolCall.function.arguments ?? {};

      logToolDebug("tool-call", {
        round,
        toolName,
        arguments: args,
        knownTool: Boolean(tool),
      });

      const result = tool
        ? await tool.execute(args)
        : { error: `Unknown tool: ${toolName}` };
      const content =
        typeof result === "string" ? result : JSON.stringify(result);

      logToolDebug("tool-result", {
        round,
        toolName,
        result: preview(content),
      });

      requestMessages.push({
        role: "tool",
        tool_name: toolName,
        content,
      });
    }
  }

  logToolDebug("max-rounds-exceeded", {
    maxToolRounds,
    messageRoles: requestMessages.map((message) => message.role),
  });

  throw new Error("Ollama exceeded the maximum number of tool rounds.");
}
