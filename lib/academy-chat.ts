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
Use list_course_availability when the customer asks about available course dates or seats.
For questions about course dates, batch times, seats, or availability, do not answer from the knowledge base. Always use list_course_availability.
When the customer mentions a month or year, include that month or year in the list_course_availability tool arguments.
Do not use list_course_availability for price, fee, curriculum, location, or registration questions unless the customer also asks about dates, seats, or availability.
For optional tool arguments, omit unknown values. Never send empty strings for month or year.
Never invent course dates, batch times, seat counts, or availability.
If list_course_availability returns no courses, say that no available dates are currently listed and offer to connect a human advisor.

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
