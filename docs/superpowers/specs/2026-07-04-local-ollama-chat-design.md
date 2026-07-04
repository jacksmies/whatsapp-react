# Local Ollama Chat Design

## Goal

Create a small Next.js chat app that lets a user type a message, send it to a locally running Ollama model, and see the assistant response in the same chat thread.

## Scope

- Use the existing `nextjs-chat-app` scaffold.
- Build a focused single-page chat interface.
- Add a client-side chat component with message display, input handling, submit handling, loading state, and errors.
- Add a Next.js App Router API route at `/api/chat`.
- Have the API route call Ollama's local chat endpoint at `http://localhost:11434/api/chat`.
- Default the model to `llama3.2`, configurable through `OLLAMA_MODEL`.
- Document how to run Ollama and the Next.js app locally.

## Architecture

The homepage renders a client chat component. The component owns the message array and draft input state. When the user submits, it appends the user message, sends the conversation to `/api/chat`, and appends the assistant reply returned by the API route.

The `/api/chat` route validates the request body, forwards messages to Ollama, and returns JSON to the browser. Keeping Ollama behind a server route avoids exposing local model configuration in client code and gives the app one place for error handling.

## UI

The app uses a focused chat layout:

- Header with the app name and local model indicator.
- Scrollable message list with distinct user and assistant bubbles.
- Bottom composer with a real input box, Send button, and Enter-to-send behavior.
- Loading state while waiting for Ollama.
- Inline error message when Ollama is not running, the model is missing, or a request fails.

The first screen is the usable chat experience, not a landing page.

## Data Flow

1. User types a message in the composer.
2. User presses Enter or clicks Send.
3. Client appends the user message and POSTs the conversation to `/api/chat`.
4. API route calls `POST http://localhost:11434/api/chat` with `{ model, messages, stream: false }`.
5. API route returns `{ message: { role: "assistant", content } }`.
6. Client appends the assistant response or shows an error.

## Error Handling

- Empty or whitespace-only messages are ignored.
- The Send button is disabled while a request is in flight.
- API route returns `400` for invalid payloads.
- API route returns `502` with a helpful message when Ollama cannot be reached or returns an invalid response.
- Client keeps the user's message visible if the response fails and displays the failure below the composer.

## Testing And Verification

- Add focused tests for the API route request validation and Ollama forwarding behavior.
- Run linting.
- Run a production build.
- Optionally run the dev server and manually verify sending a message once Ollama is running locally.

## Local Ollama Setup

Expected local setup:

```bash
ollama serve
ollama pull llama3.2
npm run dev
```

If a different model is preferred:

```bash
OLLAMA_MODEL=llama3.1 npm run dev
```
