"use client";

import { FormEvent, useState } from "react";
import type { ContactDetail } from "../../lib/chat-repository";

type ContactUpdateResponse = {
  contact?: {
    name: string | null;
    notes: string | null;
    tags: string[];
  };
  error?: string;
};

export function ContactDetailForm({ contact }: { contact: ContactDetail }) {
  const [name, setName] = useState(contact.name ?? "");
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [tags, setTags] = useState(contact.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, notes, tags }),
      });
      const data = (await response.json()) as ContactUpdateResponse;

      if (!response.ok || !data.contact) {
        throw new Error(data.error ?? "Unable to save contact.");
      }

      setName(data.contact.name ?? "");
      setNotes(data.contact.notes ?? "");
      setTags(data.contact.tags);
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save contact.");
    } finally {
      setIsSaving(false);
    }
  }

  function addTag(value: string) {
    const nextTag = value.trim();

    if (!nextTag || tags.includes(nextTag)) {
      return;
    }

    setTags((current) => [...current, nextTag]);
  }

  function handleTagInput(value: string) {
    if (!value.includes(",")) {
      setTagDraft(value);
      return;
    }

    const parts = value.split(",");
    const nextDraft = parts.pop() ?? "";

    for (const part of parts) {
      addTag(part);
    }

    setTagDraft(nextDraft);
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((currentTag) => currentTag !== tag));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={6}
          className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Tags
        <input
          value={tagDraft}
          onChange={(event) => handleTagInput(event.target.value)}
          placeholder="Type a tag, then comma"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag} tag`}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900"
            >
              <span>{tag}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
        >
          {isSaving ? "Saving..." : "Save contact"}
        </button>
        {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
      </div>
    </form>
  );
}
