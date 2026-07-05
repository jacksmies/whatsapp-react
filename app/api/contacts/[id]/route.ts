import { NextResponse } from "next/server";
import { updateContact } from "../../../../lib/chat-repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ContactUpdateRequestBody = {
  name?: string;
  notes?: string;
  tags?: string[];
};

function serializeContact(
  contact: NonNullable<Awaited<ReturnType<typeof updateContact>>>,
) {
  return {
    ...contact,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: ContactUpdateRequestBody;

  try {
    body = (await request.json()) as ContactUpdateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const contact = await updateContact(id, {
    name: body.name ?? "",
    notes: body.notes ?? "",
    tags: Array.isArray(body.tags) ? body.tags : [],
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  return NextResponse.json({ contact: serializeContact(contact) });
}
