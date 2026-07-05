import Link from "next/link";
import { listConversations } from "../../lib/chat-repository";

export const dynamic = "force-dynamic";

function formatConversationTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function conversationTitle(conversation: Awaited<ReturnType<typeof listConversations>>[number]) {
  if (conversation.channel === "whatsapp" && conversation.externalContactId) {
    return `WhatsApp ${conversation.externalContactId}`;
  }

  return `Conversation ${shortId(conversation.id)}`;
}

export default async function ConversationsPage() {
  const conversations = await listConversations();

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <header className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-semibold">Conversations</h1>
        <p className="text-sm text-zinc-600">
          Recent chats ordered by latest activity.
        </p>
      </header>

      {conversations.length === 0 ? (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white px-4 py-5 text-sm text-zinc-600 shadow-sm">
          No conversations yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-3 py-6">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/conversations/${conversation.id}`}
                className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-zinc-950">
                      {conversationTitle(conversation)}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                      {conversation.lastMessage?.content ?? "No messages yet."}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-xs font-medium text-zinc-500"
                    dateTime={conversation.updatedAt.toISOString()}
                  >
                    {formatConversationTime(conversation.updatedAt)}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
