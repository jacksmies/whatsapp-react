import { ContactsList } from "../components/contacts-list";
import { listWhatsAppContacts } from "../../lib/chat-repository";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await listWhatsAppContacts();

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <header className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-semibold">Contacts</h1>
        <p className="text-sm text-zinc-600">
          WhatsApp contacts with active conversations.
        </p>
      </header>

      {contacts.length === 0 ? (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white px-4 py-5 text-sm text-zinc-600 shadow-sm">
          No WhatsApp contacts yet.
        </div>
      ) : (
        <ContactsList contacts={contacts} />
      )}
    </section>
  );
}
