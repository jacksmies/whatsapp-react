import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { StoredMessageRole } from "../../lib/chat-repository";

export type TranscriptMessage = {
  id: string;
  role: StoredMessageRole;
  content: string;
  createdAt?: Date;
};

function formatMessageTime(createdAt: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(createdAt);
}

function MarkdownMessage({
  content,
  role,
}: Pick<TranscriptMessage, "content" | "role">) {
  const linkClassName =
    role === "user"
      ? "font-medium text-emerald-200 underline decoration-emerald-200/70 underline-offset-2"
      : "font-medium text-emerald-800 underline decoration-emerald-700/40 underline-offset-2";
  const codeClassName =
    role === "user"
      ? "rounded bg-white/15 px-1 py-0.5 font-mono text-[0.85em]"
      : "rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-950";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, ...props }) => (
          <a
            {...props}
            className={linkClassName}
            rel="noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className={codeClassName}>{children}</code>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
        ),
        p: ({ children }) => (
          <p className="mb-2 whitespace-pre-wrap last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ChatTranscript({ messages }: { messages: TranscriptMessage[] }) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-6">
      {messages.map((message) => (
        <article
          key={message.id}
          className={
            message.role === "user"
              ? "ml-auto max-w-[82%] rounded-lg bg-zinc-950 px-4 py-3 text-white shadow-sm"
              : "mr-auto max-w-[82%] rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm"
          }
        >
          <div className="text-sm leading-6">
            <MarkdownMessage content={message.content} role={message.role} />
          </div>
          {message.createdAt ? (
            <time
              dateTime={message.createdAt.toISOString()}
              className={
                message.role === "user"
                  ? "mt-2 block text-right text-[11px] leading-none text-zinc-300"
                  : "mt-2 block text-right text-[11px] leading-none text-zinc-500"
              }
            >
              {formatMessageTime(message.createdAt)}
            </time>
          ) : null}
        </article>
      ))}
    </div>
  );
}
