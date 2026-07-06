import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { buildAcademyMessages } from "../../../../lib/academy-chat";
import {
  findOrCreateWhatsAppConversation,
  getConversationMessages,
  saveMessage,
  saveMessageIfNew,
} from "../../../../lib/chat-repository";
import {
  requestOllamaChatWithTools,
  type ChatMessage,
} from "../../../../lib/ollama";
import { academyTools } from "../../../../lib/tools/registry";
import { sendWhatsAppTextMessage } from "../../../../lib/whatsapp";

const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const KNOWLEDGE_PATH = join(process.cwd(), "content", "knowledge.md");
const KNOWLEDGE_BASE = readFileSync(KNOWLEDGE_PATH, "utf8");

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppInboundMessage[];
      };
    }>;
  }>;
};

type WhatsAppInboundMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: {
    body?: string;
  };
};

type ParsedInboundTextMessage = {
  from: string;
  externalMessageId: string;
  content: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    verifyToken &&
    verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: "Webhook verification failed." },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isValidWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let payload: WhatsAppWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const inboundMessages = parseInboundTextMessages(payload);

  try {
    for (const inboundMessage of inboundMessages) {
      await handleInboundTextMessage(inboundMessage);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process WhatsApp webhook.",
      },
      { status: 502 },
    );
  }
}

function parseInboundTextMessages(payload: WhatsAppWebhookPayload) {
  const parsedMessages: ParsedInboundTextMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        const content = message.text?.body?.trim();

        if (
          message.type === "text" &&
          message.from &&
          message.id &&
          content
        ) {
          parsedMessages.push({
            from: message.from,
            externalMessageId: message.id,
            content,
          });
        }
      }
    }
  }

  return parsedMessages;
}

async function handleInboundTextMessage(message: ParsedInboundTextMessage) {
  const conversation = await findOrCreateWhatsAppConversation({
    externalContactId: message.from,
  });
  const inboundSave = await saveMessageIfNew({
    conversationId: conversation.id,
    role: "user",
    senderType: "customer",
    content: message.content,
    externalMessageId: message.externalMessageId,
  });

  if (!inboundSave.created || !conversation.aiAutoReplyEnabled) {
    return;
  }

  const history = await getConversationMessages(conversation.id);
  const chatMessages: ChatMessage[] = history.map(({ role, content }) => ({
    role,
    content,
  }));
  const assistantMessage = await requestOllamaChatWithTools({
    model: process.env.OLLAMA_MODEL ?? DEFAULT_MODEL,
    messages: buildAcademyMessages({
      knowledge: KNOWLEDGE_BASE,
      messages: chatMessages,
    }),
    tools: academyTools,
  });
  const { messageId } = await sendWhatsAppTextMessage({
    to: message.from,
    text: assistantMessage.content,
  });

  await saveMessage({
    conversationId: conversation.id,
    role: "assistant",
    senderType: "ai",
    content: assistantMessage.content,
    externalMessageId: messageId,
  });
}

function isValidWebhookSignature(rawBody: string, headers: Headers) {
  const appSecret = process.env.META_APP_SECRET;
  const receivedSignature = headers.get("x-hub-signature-256");

  if (!appSecret || !receivedSignature?.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = `sha256=${createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
