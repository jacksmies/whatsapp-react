import type { ChatMessage } from "./ollama";

const DEFAULT_MAX_HISTORY_MESSAGES = 8;

type BuildSystemPromptInput = {
  knowledge: string;
  question: string;
};

type BuildAcademyMessagesInput = {
  knowledge: string;
  messages: ChatMessage[];
  maxHistoryMessages?: number;
};

function isConversationMessage(message: ChatMessage) {
  return message.role === "user" || message.role === "assistant";
}

function latestUserQuestion(messages: ChatMessage[]) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "user" && message.content.trim())
    ?.content.trim();
}

function trimConversationMemory(messages: ChatMessage[], maxHistoryMessages: number) {
  const conversation = messages
    .filter(isConversationMessage)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);

  const firstUserIndex = conversation.findIndex(
    (message) => message.role === "user",
  );

  if (firstUserIndex === -1) {
    return [];
  }

  return conversation.slice(firstUserIndex).slice(-maxHistoryMessages);
}

export function buildSystemPromptWithKnowledge({
  knowledge,
  question,
}: BuildSystemPromptInput) {
  return `You are a helpful academy assistant.
Use the customer question below to answer from the knowledge base.
If the answer is in the knowledge base, answer directly and briefly. If the knowledge base does not contain the answer, say that you do not know and offer to help with courses, location, fees, or enrollment.

Knowledge base:
${knowledge}

Customer question:
${question}`;
}

export function buildAcademyMessages({
  knowledge,
  messages,
  maxHistoryMessages = DEFAULT_MAX_HISTORY_MESSAGES,
}: BuildAcademyMessagesInput): ChatMessage[] {
  const question = latestUserQuestion(messages) ?? "";
  const history = trimConversationMemory(messages, maxHistoryMessages);

  return [
    {
      role: "system",
      content: buildSystemPromptWithKnowledge({ knowledge, question }),
    },
    ...history,
  ];
}
