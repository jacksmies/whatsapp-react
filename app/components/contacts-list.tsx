"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { WhatsAppContact } from "../../lib/chat-repository";

function formatContactTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function matchesSearch(contact: WhatsAppContact, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    contact.phoneNumber,
    contact.name ?? "",
    ...contact.tags,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function ContactsList({ contacts }: { contacts: WhatsAppContact[] }) {
  const [query, setQuery] = useState("");
  const filteredContacts = useMemo(
    () => contacts.filter((contact) => matchesSearch(contact, query)),
    [contacts, query],
  );

  return (
    <>
      <div className="pt-5">
        <label className="sr-only" htmlFor="contacts-search">
          Search contacts
        </label>
        <input
          id="contacts-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, phone, or tag"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {filteredContacts.length === 0 ? (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white px-4 py-5 text-sm text-zinc-600 shadow-sm">
          No matching contacts.
        </div>
      ) : (
        <ul className="flex flex-col gap-3 py-6">
          {filteredContacts.map((contact) => (
            <li key={contact.id}>
              <Link
                href={`/contacts/${contact.id}`}
                className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-950">
                      {contact.name ?? contact.phoneNumber}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {contact.name ? `${contact.phoneNumber} · ` : ""}
                      {contact.aiAutoReplyEnabled ? "AI" : "Human"}
                    </p>
                    {contact.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {contact.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <time
                    className="text-xs font-medium text-zinc-500"
                    dateTime={contact.lastMessageAt.toISOString()}
                  >
                    {formatContactTime(contact.lastMessageAt)}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
