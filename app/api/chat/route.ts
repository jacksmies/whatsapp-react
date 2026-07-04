import { NextResponse } from "next/server";
import { requestOllamaChat, type ChatMessage } from "../../../lib/ollama";

const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

type ChatRequestBody = {
  messages?: ChatMessage[];
};

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

  try {
    const message = await requestOllamaChat({
      model: DEFAULT_MODEL,
      messages: body.messages,
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
