import { NextResponse } from "next/server";
import { setAiAutoReply } from "../../../../../lib/chat-repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AiAutoReplyRequestBody = {
  enabled?: boolean;
};

function serializeConversation(
  conversation: NonNullable<Awaited<ReturnType<typeof setAiAutoReply>>>,
) {
  return {
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: AiAutoReplyRequestBody;

  try {
    body = (await request.json()) as AiAutoReplyRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "Request body must include an enabled boolean." },
      { status: 400 },
    );
  }

  const conversation = await setAiAutoReply(id, body.enabled);

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    conversation: serializeConversation(conversation),
  });
}
