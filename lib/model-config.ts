const DEFAULT_MODEL_BASE_URL = "http://localhost:11434/api/chat";
const DEFAULT_MODEL_NAME = "llama3.2";

function firstConfiguredValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function getModelBaseUrl() {
  return (
    firstConfiguredValue(
      process.env.MODEL_BASE_URL,
      process.env.OPENAI_BASE_URL,
      process.env.OLLAMA_BASE_URL,
    ) ?? DEFAULT_MODEL_BASE_URL
  );
}

export function getModelName() {
  return (
    firstConfiguredValue(
      process.env.MODEL_NAME,
      process.env.OPENAI_MODEL,
      process.env.OLLAMA_MODEL,
    ) ?? DEFAULT_MODEL_NAME
  );
}

export function getModelApiKey() {
  return firstConfiguredValue(
    process.env.MODEL_API_KEY,
    process.env.OPENAI_API_KEY,
  );
}

export function getModelReasoningEffort() {
  return firstConfiguredValue(process.env.MODEL_REASONING_EFFORT);
}
