import { NextResponse } from "next/server";
import {
  getConversation,
  getConversationMessages,
} from "../../../../lib/chat-repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function serializeConversation(
  conversation: NonNullable<Awaited<ReturnType<typeof getConversation>>>,
) {
  return {
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
  };
}

function serializeMessage(
  message: Awaited<ReturnType<typeof getConversationMessages>>[number],
) {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const [conversation, messages] = await Promise.all([
    getConversation(id),
    getConversationMessages(id),
  ]);

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    conversation: serializeConversation(conversation),
    messages: messages.map(serializeMessage),
  });
}
