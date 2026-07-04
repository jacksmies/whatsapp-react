export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

type BuildPayloadInput = {
  model: string;
  messages: ChatMessage[];
};

type OllamaResponse = {
  message?: {
    role?: string;
    content?: string;
  };
  error?: string;
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
    stream: false,
    messages: normalizedMessages,
  };
}

export async function requestOllamaChat(input: BuildPayloadInput) {
  const response = await fetch(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildOllamaPayload(input)),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "Ollama request failed.");
  }

  const data = (await response.json()) as OllamaResponse;
  const content = data.message?.content?.trim();

  if (!content) {
    throw new Error(data.error || "Ollama returned an empty response.");
  }

  return {
    role: "assistant" as const,
    content,
  };
}
