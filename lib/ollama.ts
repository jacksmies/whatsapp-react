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

const OLLAMA_CHAT_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/api/chat";

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
  const response = await fetch(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "Ollama request failed.");
  }

  return (await response.json()) as OllamaResponse;
}

export async function requestOllamaChat(input: BuildPayloadInput) {
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
