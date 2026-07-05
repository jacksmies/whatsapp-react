import { NextResponse } from "next/server";
import {
  disableAiAutoReply,
  getConversation,
  saveMessage,
} from "../../../../../lib/chat-repository";
import { sendWhatsAppTextMessage } from "../../../../../lib/whatsapp";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type MessageRequestBody = {
  content?: string;
};

function serializeMessage(message: Awaited<ReturnType<typeof saveMessage>>) {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: MessageRequestBody;

  try {
    body = (await request.json()) as MessageRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json(
      { error: "Message content is required." },
      { status: 400 },
    );
  }

  const conversation = await getConversation(id);

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  if (conversation.channel !== "whatsapp" || !conversation.externalContactId) {
    return NextResponse.json(
      { error: "This conversation is not connected to WhatsApp." },
      { status: 400 },
    );
  }

  try {
    await disableAiAutoReply(id);
    const { messageId } = await sendWhatsAppTextMessage({
      to: conversation.externalContactId,
      text: content,
    });
    const message = await saveMessage({
      conversationId: id,
      role: "assistant",
      senderType: "human",
      content,
      externalMessageId: messageId,
    });

    return NextResponse.json({
      message: serializeMessage(message),
      aiAutoReplyEnabled: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send WhatsApp message.",
      },
      { status: 502 },
    );
  }
}
