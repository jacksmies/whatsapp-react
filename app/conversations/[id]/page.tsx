import Link from "next/link";
import { notFound } from "next/navigation";
import { ConversationOperator } from "../../components/conversation-operator";
import {
  getContactForConversation,
  getConversation,
  getConversationMessages,
} from "../../../lib/chat-repository";

export const dynamic = "force-dynamic";

type ConversationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function shortId(id: string) {
  return id.slice(0, 8);
}

function conversationTitle(
  conversation: NonNullable<Awaited<ReturnType<typeof getConversation>>>,
) {
  if (conversation.channel === "whatsapp" && conversation.externalContactId) {
    return `WhatsApp ${conversation.externalContactId}`;
  }

  return `Conversation ${shortId(conversation.id)}`;
}

function ConversationHeading({
  contact,
  title,
}: {
  contact: Awaited<ReturnType<typeof getContactForConversation>>;
  title: string;
}) {
  if (!contact) {
    return <h1 className="mt-2 text-xl font-semibold">{title}</h1>;
  }

  return (
    <h1 className="mt-2 text-xl font-semibold">
      <Link
        href={`/contacts/${contact.id}`}
        className="text-emerald-800 underline decoration-emerald-700/40 underline-offset-2"
      >
        {title}
      </Link>
    </h1>
  );
}

export default async function ConversationDetailPage({
  params,
}: ConversationDetailPageProps) {
  const { id } = await params;
  const [conversation, messages, contact] = await Promise.all([
    getConversation(id),
    getConversationMessages(id),
    getContactForConversation(id),
  ]);

  if (!conversation) {
    notFound();
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <Link
            href="/conversations"
            className="text-sm font-medium text-emerald-800 underline decoration-emerald-700/40 underline-offset-2"
          >
            Conversations
          </Link>
          <ConversationHeading
            contact={contact}
            title={conversationTitle(conversation)}
          />
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          {messages.length} messages
        </span>
      </header>

      <ConversationOperator
        conversation={conversation}
        initialMessages={messages}
      />
    </section>
  );
}
