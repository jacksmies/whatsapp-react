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
