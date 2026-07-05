"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  StoredConversation,
  StoredMessage,
} from "../../lib/chat-repository";
import { ChatTranscript } from "./chat-transcript";

type HumanReplyResponse = {
  message?: StoredMessage & {
    createdAt: string;
  };
  aiAutoReplyEnabled?: boolean;
  error?: string;
};

type ToggleResponse = {
  conversation?: StoredConversation & {
    createdAt: string;
  };
  error?: string;
};

type ConversationRefreshResponse = {
  conversation?: StoredConversation & {
    createdAt: string;
  };
  messages?: Array<
    StoredMessage & {
      createdAt: string;
    }
  >;
  error?: string;
};

function hydrateMessage(
  message: StoredMessage & {
    createdAt: string;
  },
): StoredMessage {
  return {
    ...message,
    createdAt: new Date(message.createdAt),
  };
}

export function ConversationOperator({
  conversation,
  initialMessages,
  refreshIntervalMs = 3000,
}: {
  conversation: StoredConversation;
  initialMessages: StoredMessage[];
  refreshIntervalMs?: number;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [aiAutoReplyEnabled, setAiAutoReplyEnabled] = useState(
    conversation.aiAutoReplyEnabled,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const isWhatsApp = conversation.channel === "whatsapp";
  const canSend = useMemo(
    () => isWhatsApp && draft.trim().length > 0 && !isSending,
    [draft, isSending, isWhatsApp],
  );

  useEffect(() => {
    if (!isWhatsApp) {
      return;
    }

    let cancelled = false;

    async function refreshConversation() {
      try {
        const response = await fetch(`/api/conversations/${conversation.id}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as ConversationRefreshResponse;

        if (
          cancelled ||
          !response.ok ||
          !data.conversation ||
          !data.messages
        ) {
          return;
        }

        setMessages(data.messages.map(hydrateMessage));
        setAiAutoReplyEnabled(data.conversation.aiAutoReplyEnabled);
      } catch {
        // Keep the current transcript visible if a refresh attempt fails.
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshConversation();
    }, refreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [conversation.id, isWhatsApp, refreshIntervalMs]);

  async function sendHumanReply() {
    const content = draft.trim();

    if (!content || !isWhatsApp || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const data = (await response.json()) as HumanReplyResponse;

      if (!response.ok || !data.message) {
        throw new Error(data.error ?? "Unable to send WhatsApp message.");
      }

      const savedMessage = data.message;

      setMessages((current) => [...current, hydrateMessage(savedMessage)]);
      setAiAutoReplyEnabled(Boolean(data.aiAutoReplyEnabled));
      setDraft("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send WhatsApp message.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function toggleAiAutoReply() {
    if (!isWhatsApp || isToggling) {
      return;
    }

    const nextEnabled = !aiAutoReplyEnabled;

    setIsToggling(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/ai-auto-reply`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: nextEnabled }),
        },
      );
      const data = (await response.json()) as ToggleResponse;

      if (!response.ok || !data.conversation) {
        throw new Error(data.error ?? "Unable to update AI auto-reply.");
      }

      setAiAutoReplyEnabled(data.conversation.aiAutoReplyEnabled);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update AI auto-reply.",
      );
    } finally {
      setIsToggling(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendHumanReply();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-950">
            {aiAutoReplyEnabled ? "AI handling replies" : "Human operator mode"}
          </p>
          <p className="text-xs text-zinc-600">
            Human replies automatically turn AI auto-reply off.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Conversation mode"
          aria-checked={aiAutoReplyEnabled}
          onClick={() => void toggleAiAutoReply()}
          disabled={!isWhatsApp || isToggling}
          className={`flex min-w-28 items-center gap-2 rounded-full border px-2 py-1 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            aiAutoReplyEnabled
              ? "border-emerald-700 bg-emerald-50 text-emerald-900"
              : "border-zinc-300 bg-white text-zinc-800"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-6 w-6 rounded-full transition ${
              aiAutoReplyEnabled ? "bg-emerald-700" : "bg-zinc-400"
            }`}
          />
          {aiAutoReplyEnabled ? "AI" : "Human"}
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <ChatTranscript messages={messages} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-200 bg-stone-100 pt-4"
      >
        {error ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {isWhatsApp ? (
          <div className="flex gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              placeholder="Write a human reply..."
              className="min-h-14 flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="h-14 rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
            >
              {isSending ? "Sending..." : "Send to WhatsApp"}
            </button>
          </div>
        ) : (
          <p className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
            Manual replies are available for WhatsApp conversations.
          </p>
        )}
      </form>
    </>
  );
}
