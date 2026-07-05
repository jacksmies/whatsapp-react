import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactDetailForm } from "../../components/contact-detail-form";
import { getContactDetail } from "../../../lib/chat-repository";

export const dynamic = "force-dynamic";

type ContactDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function contactTitle(contact: NonNullable<Awaited<ReturnType<typeof getContactDetail>>>) {
  return contact.name ?? contact.phoneNumber;
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { id } = await params;
  const contact = await getContactDetail(id);

  if (!contact) {
    notFound();
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <header className="border-b border-zinc-200 pb-4">
        <Link
          href="/contacts"
          className="text-sm font-medium text-emerald-800 underline decoration-emerald-700/40 underline-offset-2"
        >
          Contacts
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{contactTitle(contact)}</h1>
        <p className="text-sm text-zinc-600">{contact.phoneNumber}</p>
      </header>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <Link
          href={`/conversations/${contact.conversationId}`}
          className="text-sm font-semibold text-emerald-800 underline decoration-emerald-700/40 underline-offset-2"
        >
          {contact.messageCount}{" "}
          {contact.messageCount === 1 ? "message" : "messages"}
        </Link>
      </div>

      <ContactDetailForm contact={contact} />
    </section>
  );
}
