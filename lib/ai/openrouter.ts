/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a minimal client for the OpenRouter API. You may update this service, but you should not need to.

valid model names (examples):
openai/gpt-4.1
openai/o4-mini
openai/gpt-4o
*/

export type OpenRouterClient = {
  baseUrl: string;
  headers: Record<string, string>;
};

export const getOpenRouterClient = (): OpenRouterClient => {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("OpenRouter API key not found in environment variables");
  }
  return {
    // Hardcoded base URL for OpenRouter API
    baseUrl: "https://openrouter.ai/api/v1",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey ? `Bearer ${apiKey}` : "",
    },
  };
};
