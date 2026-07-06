"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChatTranscript } from "./chat-transcript";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: Date;
};

type ChatResponse = {
  message?: {
    role: "assistant";
    content: string;
  };
  error?: string;
  model?: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Hi. Ask me anything about Klaster.",
  },
];

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${crypto.randomUUID()}`,
    role,
    content,
    createdAt: new Date(),
  };
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !isSending,
    [draft, isSending],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "end",
    });
    inputRef.current?.focus();
  }, [messages, isSending]);

  async function sendMessage() {
    const content = draft.trim();

    if (!content || isSending) {
      return;
    }

    const userMessage = createMessage("user", content);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      const data = (await response.json()) as ChatResponse;

      if (!response.ok || !data.message?.content) {
        throw new Error(data.error || "The local model did not respond.");
      }

      const assistantContent = data.message.content;

      setMessages((current) => [
        ...current,
        createMessage("assistant", assistantContent),
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach Ollama. Make sure it is running locally.",
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold">Whatsapp Chat</h1>
          <p className="text-sm text-zinc-600">
            Ask me some questions so we can train the model for Klaster{" "}
          </p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          llama3.2
        </span>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <ChatTranscript messages={messages} />
        {isSending ? (
          <div className="mr-auto rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm">
            Bot is thinking...
          </div>
        ) : null}
        <div ref={messagesEndRef} aria-hidden="true" />
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
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Type a message for Ollama..."
            className="min-h-14 flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="h-14 rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
