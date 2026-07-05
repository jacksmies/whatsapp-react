# Local Ollama Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable Next.js chat page that sends user messages to a local Ollama model and displays responses.

**Architecture:** The browser renders a client chat component and posts conversations to a server-only `/api/chat` route. The route validates messages, calls Ollama's local `/api/chat` endpoint through a small helper, and returns a normalized assistant message.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest for focused route/helper tests.

---

## File Structure

- Create: `lib/ollama.ts` - validates chat messages and forwards requests to Ollama.
- Create: `lib/ollama.test.ts` - tests payload validation, Ollama forwarding, and error handling.
- Create: `app/api/chat/route.ts` - Next.js API route for chat requests.
- Create: `app/components/chat.tsx` - client chat UI with message list and input composer.
- Modify: `app/page.tsx` - render the chat component instead of the scaffold page.
- Modify: `app/layout.tsx` - update metadata for the chat app.
- Modify: `app/globals.css` - set full-height app defaults and restrained colors.
- Modify: `package.json` - add a `test` script and Vitest dependency.
- Modify: `README.md` - document Ollama setup and local commands.

### Task 1: Add Test Harness And Ollama Helper

**Files:**

- Modify: `package.json`
- Create: `lib/ollama.test.ts`
- Create: `lib/ollama.ts`

- [ ] **Step 1: Install Vitest**

Run:

```bash
npm install -D vitest
```

Expected: `package.json` and `package-lock.json` include `vitest`.

- [ ] **Step 2: Add the test script**

Update `package.json` scripts to include:

```json
"test": "vitest run"
```

- [ ] **Step 3: Write failing helper tests**

Create `lib/ollama.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOllamaPayload, requestOllamaChat } from "./ollama";

describe("buildOllamaPayload", () => {
  it("keeps only supported message roles and trims content", () => {
    expect(
      buildOllamaPayload({
        model: "llama3.2",
        messages: [
          { role: "user", content: "  hello  " },
          { role: "assistant", content: "hi" },
        ],
      }),
    ).toEqual({
      model: "llama3.2",
      stream: false,
      messages: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ],
    });
  });

  it("throws when messages are missing", () => {
    expect(() =>
      buildOllamaPayload({ model: "llama3.2", messages: [] }),
    ).toThrow("At least one message is required.");
  });
});

describe("requestOllamaChat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts a non-streaming chat request to Ollama", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: { role: "assistant", content: "Hello from Ollama" },
        }),
      ),
    );

    await expect(
      requestOllamaChat({
        model: "llama3.2",
        messages: [{ role: "user", content: "hello" }],
      }),
    ).resolves.toEqual({ role: "assistant", content: "Hello from Ollama" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2",
          stream: false,
          messages: [{ role: "user", content: "hello" }],
        }),
      }),
    );
  });
});
```

- [ ] **Step 4: Run tests and verify they fail**

Run:

```bash
npm test -- lib/ollama.test.ts
```

Expected: FAIL because `./ollama` does not exist.

- [ ] **Step 5: Implement the helper**

Create `lib/ollama.ts`:

```ts
export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

type BuildPayloadInput = {
  model: string;
  messages: ChatMessage[];
};

type OllamaResponse = {
  message?: {
    role?: string;
    content?: string;
  };
  error?: string;
};

const OLLAMA_CHAT_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/api/chat";

function isChatRole(role: string): role is ChatRole {
  return role === "system" || role === "user" || role === "assistant";
}

export function buildOllamaPayload({ model, messages }: BuildPayloadInput) {
  const normalizedMessages = messages
    .filter((message) => isChatRole(message.role))
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);

  if (normalizedMessages.length === 0) {
    throw new Error("At least one message is required.");
  }

  return {
    model,
    stream: false,
    messages: normalizedMessages,
  };
}

export async function requestOllamaChat(input: BuildPayloadInput) {
  const response = await fetch(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildOllamaPayload(input)),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "Ollama request failed.");
  }

  const data = (await response.json()) as OllamaResponse;
  const content = data.message?.content?.trim();

  if (!content) {
    throw new Error(data.error || "Ollama returned an empty response.");
  }

  return {
    role: "assistant" as const,
    content,
  };
}
```

- [ ] **Step 6: Run tests and verify they pass**

Run:

```bash
npm test -- lib/ollama.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add package.json package-lock.json lib/ollama.ts lib/ollama.test.ts
git commit -m "test: add ollama chat helper"
```

### Task 2: Add The Chat API Route

**Files:**

- Create: `app/api/chat/route.ts`
- Modify: `lib/ollama.test.ts`

- [ ] **Step 1: Add route behavior tests**

Append route-oriented tests to `lib/ollama.test.ts` for invalid payloads and failed Ollama responses:

```ts
it("rejects invalid chat payloads before forwarding", () => {
  expect(() =>
    buildOllamaPayload({
      model: "llama3.2",
      messages: [{ role: "user", content: "   " }],
    }),
  ).toThrow("At least one message is required.");
});

it("reports unreachable Ollama responses", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("model not found", { status: 404 }),
  );

  await expect(
    requestOllamaChat({
      model: "llama3.2",
      messages: [{ role: "user", content: "hello" }],
    }),
  ).rejects.toThrow("model not found");
});
```

- [ ] **Step 2: Run tests and verify they pass against the helper**

Run:

```bash
npm test -- lib/ollama.test.ts
```

Expected: PASS.

- [ ] **Step 3: Implement the route**

Create `app/api/chat/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requestOllamaChat, type ChatMessage } from "@/lib/ollama";

const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

type ChatRequestBody = {
  messages?: ChatMessage[];
};

export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "Request body must include a messages array." },
      { status: 400 },
    );
  }

  try {
    const message = await requestOllamaChat({
      model: DEFAULT_MODEL,
      messages: body.messages,
    });

    return NextResponse.json({ message, model: DEFAULT_MODEL });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to contact Ollama.";

    return NextResponse.json(
      {
        error:
          message ||
          "Unable to contact Ollama. Make sure `ollama serve` is running.",
      },
      { status: message === "At least one message is required." ? 400 : 502 },
    );
  }
}
```

- [ ] **Step 4: Commit**

Run:

```bash
git add app/api/chat/route.ts lib/ollama.test.ts
git commit -m "feat: add ollama chat api route"
```

### Task 3: Build The Chat UI

**Files:**

- Create: `app/components/chat.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Create the client chat component**

Create `app/components/chat.tsx`:

```tsx
"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
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
  };
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !isSending,
    [draft, isSending],
  );

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

      setMessages((current) => [
        ...current,
        createMessage("assistant", data.message.content),
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
    <main className="flex min-h-screen bg-stone-100 text-zinc-950">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold">Local Ollama Chat</h1>
            <p className="text-sm text-zinc-600">
              Next.js connected to your local model
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            llama3.2
          </span>
        </header>

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
              <p className="whitespace-pre-wrap text-sm leading-6">
                {message.content}
              </p>
            </article>
          ))}

          {isSending ? (
            <div className="mr-auto rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm">
              Bot is thinking...
            </div>
          ) : null}
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
    </main>
  );
}
```

- [ ] **Step 2: Wire the homepage**

Replace `app/page.tsx` with:

```tsx
import { Chat } from "./components/chat";

export default function Home() {
  return <Chat />;
}
```

- [ ] **Step 3: Update metadata**

Change `app/layout.tsx` metadata to:

```ts
export const metadata: Metadata = {
  title: "Local Ollama Chat",
  description: "A local Next.js chat app powered by Ollama.",
};
```

- [ ] **Step 4: Update global styles**

Replace `app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --background: #f5f5f4;
  --foreground: #18181b;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

button,
textarea {
  font: inherit;
}
```

- [ ] **Step 5: Run lint and build**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add app/components/chat.tsx app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: build local ollama chat ui"
```

### Task 4: Document Local Usage

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Update README commands**

Replace `README.md` with:

````md
# Local Ollama Chat

A small Next.js app that sends chat messages to a locally running Ollama model.

## Requirements

- Node.js 20 or newer
- Ollama installed locally

## Ollama Setup

Start the Ollama server:

```bash
ollama serve
```
````

In another terminal, pull the default model:

```bash
ollama pull llama3.2
```

## Next.js Setup

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and type a message in the chat input.

## Configuration

Use a different local model:

```bash
OLLAMA_MODEL=llama3.1 npm run dev
```

Use a different Ollama chat endpoint:

```bash
OLLAMA_BASE_URL=http://localhost:11434/api/chat npm run dev
```

## Scripts

```bash
npm run dev
npm test
npm run lint
npm run build
```

````

- [ ] **Step 2: Verify docs and final status**

Run:

```bash
npm test
npm run lint
npm run build
git status --short
````

Expected: tests, lint, and build PASS; git status shows only intended README changes before commit.

- [ ] **Step 3: Commit**

Run:

```bash
git add README.md
git commit -m "docs: add ollama setup instructions"
```
