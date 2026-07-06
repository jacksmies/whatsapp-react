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

Use a different model:

```bash
MODEL_NAME=llama3.1 npm run dev
```

Use a different model chat endpoint:

```bash
MODEL_BASE_URL=http://localhost:11434/api/chat npm run dev
```

Use an API key for a cloud or OpenAI-compatible endpoint:

```bash
MODEL_API_KEY=sk-your-key npm run dev
```

Groq's OpenAI Responses endpoint can be configured like this:

```env
MODEL_NAME=openai/gpt-oss-20b
MODEL_BASE_URL=https://api.groq.com/openai/v1
MODEL_API_KEY=gsk-your-key
MODEL_REASONING_EFFORT=low
```

When `MODEL_BASE_URL` ends in `/v1`, the app posts to `/responses` with an
OpenAI Responses-style payload. `MODEL_REASONING_EFFORT` is optional; when set,
reasoning summaries returned by the provider are logged to the terminal but kept
out of customer-facing replies.

You can also set these in `.env`:

```env
MODEL_NAME=llama3.2
MODEL_BASE_URL=http://localhost:11434/api/chat
MODEL_API_KEY=
MODEL_REASONING_EFFORT=
```

The older `OLLAMA_MODEL` and `OLLAMA_BASE_URL` variables are still supported.
The OpenAI-style aliases `OPENAI_MODEL`, `OPENAI_BASE_URL`, and
`OPENAI_API_KEY` are also supported.

## Scripts

```bash
npm run dev
npm test
npm run lint
npm run build
```

## Docker Deployment

The app includes a production `Dockerfile` and `docker-compose.yml`.

Set production values in `.env` on the server. If Postgres is another container,
use its Docker service/container name instead of `localhost`:

```env
DATABASE_URL=postgres://postgres:postgres@postgres:5432/chatbot
DOCKER_NETWORK=app-network
MODEL_NAME=openai/gpt-oss-20b
MODEL_BASE_URL=https://api.groq.com/openai/v1
MODEL_API_KEY=gsk-your-key
```

The compose file joins an external Docker network. It defaults to
`app-network`, or you can override it with `DOCKER_NETWORK` in `.env`.

Create the network if it does not already exist:

```bash
docker network create app-network
```

Build and start the app:

```bash
docker compose up -d --build
```

Run database migrations from the app image:

```bash
docker compose run --rm migrate
```

Caddy can reverse proxy to the app container on port `3000`, for example:

```caddyfile
chat.example.com {
  reverse_proxy nextjs-chat-app:3000
}
```
