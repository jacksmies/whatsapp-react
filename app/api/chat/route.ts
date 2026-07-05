import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAcademyMessages } from "../../../lib/academy-chat";
import { saveMessage } from "../../../lib/chat-repository";
import { requestOllamaChat, type ChatMessage } from "../../../lib/ollama";

const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const KNOWLEDGE_PATH = join(process.cwd(), "content", "knowledge.md");
const KNOWLEDGE_BASE = readFileSync(KNOWLEDGE_PATH, "utf8");

type ChatRequestBody = {
  conversationId?: string;
  messages?: ChatMessage[];
};

function latestUserMessage(messages: ChatMessage[]) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "user" && message.content.trim());
}

export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "Request body must include a messages array." },
      { status: 400 },
    );
  }

  if (!body.conversationId?.trim()) {
    return NextResponse.json(
      { error: "Request body must include a conversationId." },
      { status: 400 },
    );
  }

  try {
    const userMessage = latestUserMessage(body.messages);

    if (!userMessage) {
      throw new Error("At least one message is required.");
    }

    await saveMessage({
      conversationId: body.conversationId,
      role: "user",
      content: userMessage.content.trim(),
    });

    const message = await requestOllamaChat({
      model: DEFAULT_MODEL,
      messages: buildAcademyMessages({
        knowledge: KNOWLEDGE_BASE,
        messages: body.messages,
      }),
    });

    await saveMessage({
      conversationId: body.conversationId,
      role: "assistant",
      content: message.content,
    });

    return NextResponse.json({ message, model: DEFAULT_MODEL });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to contact Ollama.";

    return NextResponse.json(
      {
        error:
          message ||
          "Unable to contact Ollama. Make sure `ollama serve` is running.",
      },
      { status: message === "At least one message is required." ? 400 : 502 },
    );
  }
}
