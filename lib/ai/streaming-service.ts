import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';

const BASE_URL = 'https://epidermoid-stefani-legatine.ngrok-free.dev';

const API_KEYS = {
  openai: 'sk-proj-anielepohng9eing5Ol6Phex3oin9geg-n0tr3al',
  anthropic: 'sk-ant-api03-gu2gohc4sha1Thohpeep7ro9vie1ikai-n0tr3al',
  xai: 'xai-ahDi8ofei1Em2chaichoac2Beehi8thu-n0tr3al',
};

const streamingFetch = Platform.OS === 'web' ? fetch : expoFetch;

export type ModelProvider = 'openai' | 'anthropic' | 'xai';

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  supportsImages: boolean;
  contextWindow: number;
}

export const AVAILABLE_MODELS: Model[] = [
  // OpenAI - GPT-4o first
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', supportsImages: true, contextWindow: 128000 },
  // Anthropic - Claude Sonnet 4 second
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', supportsImages: true, contextWindow: 200000 },
  // Anthropic - Claude Opus 4
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic', supportsImages: true, contextWindow: 200000 },
  // OpenAI - Other models
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', supportsImages: true, contextWindow: 128000 },
  { id: 'o1', name: 'o1', provider: 'openai', supportsImages: true, contextWindow: 200000 },
  { id: 'o1-mini', name: 'o1 Mini', provider: 'openai', supportsImages: true, contextWindow: 128000 },
  // Anthropic - Claude Haiku 3.5
  { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku 3.5', provider: 'anthropic', supportsImages: true, contextWindow: 200000 },
  // xAI - Grok models
  { id: 'grok-2-latest', name: 'Grok 2', provider: 'xai', supportsImages: false, contextWindow: 131072 },
];

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

function parseSSELine(line: string): string | null {
  if (line.startsWith('data: ')) {
    const data = line.slice(6);
    if (data === '[DONE]') return null;
    try {
      const parsed = JSON.parse(data);
      if (parsed.choices?.[0]?.delta?.content) {
        return parsed.choices[0].delta.content;
      }
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        return parsed.delta.text;
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function streamOpenAIStyle(
  endpoint: string,
  headers: Record<string, string>,
  body: object,
  callbacks: StreamCallbacks
): Promise<void> {
  console.log('[Streaming] Starting OpenAI-style stream to:', endpoint);
  console.log('[Streaming] Request headers:', JSON.stringify(headers, null, 2));
  console.log('[Streaming] Request body model:', (body as { model?: string }).model);

  const requestBody = { ...body, stream: true };
  console.log('[Streaming] Full request body:', JSON.stringify(requestBody, null, 2).substring(0, 500));

  const response = await streamingFetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(requestBody),
    signal: callbacks.signal,
  });

  console.log('[Streaming] Response status:', response.status);
  console.log('[Streaming] Response ok:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Streaming] Error response status:', response.status);
    console.error('[Streaming] Error response text:', errorText);
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No readable stream available');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const token = parseSSELine(line.trim());
        if (token) {
          fullText += token;
          callbacks.onToken(token);
        }
      }
    }

    if (buffer.trim()) {
      const token = parseSSELine(buffer.trim());
      if (token) {
        fullText += token;
        callbacks.onToken(token);
      }
    }

    callbacks.onComplete(fullText);
    console.log('[Streaming] Stream completed, total length:', fullText.length);
  } catch (error) {
    console.error('[Streaming] Stream error:', error);
    throw error;
  }
}

async function streamAnthropic(
  messages: ChatMessage[],
  model: string,
  callbacks: StreamCallbacks
): Promise<void> {
  console.log('[Streaming] Starting Anthropic stream with model:', model);
  console.log('[Streaming] Anthropic API key prefix:', API_KEYS.anthropic.substring(0, 15) + '...');
  console.log('[Streaming] Messages count:', messages.length);

  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content };
      }
      const content = m.content.map(c => {
        if (c.type === 'text') return { type: 'text' as const, text: c.text || '' };
        if (c.type === 'image_url' && c.image_url) {
          const url = c.image_url.url;
          if (url.startsWith('data:')) {
            const [meta, data] = url.split(',');
            const mediaType = meta.split(':')[1].split(';')[0];
            return {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: mediaType,
                data: data,
              },
            };
          }
        }
        return { type: 'text' as const, text: '' };
      });
      return { role: m.role, content };
    });

  const systemMessage = messages.find(m => m.role === 'system');
  const systemText = typeof systemMessage?.content === 'string' ? systemMessage.content : undefined;

  console.log('[Streaming] Anthropic endpoint:', `${BASE_URL}/v1/messages`);
  console.log('[Streaming] Anthropic request model:', model);

  const response = await streamingFetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEYS.anthropic,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      messages: anthropicMessages,
      max_tokens: 4096,
      stream: true,
      ...(systemText && { system: systemText }),
    }),
    signal: callbacks.signal,
  });

  console.log('[Streaming] Anthropic response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Streaming] Anthropic error:', errorText);
    throw new Error(`Anthropic API Error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No readable stream available');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text;
              callbacks.onToken(parsed.delta.text);
            }
          } catch {
            continue;
          }
        }
      }
    }

    callbacks.onComplete(fullText);
    console.log('[Streaming] Anthropic stream completed');
  } catch (error) {
    console.error('[Streaming] Anthropic stream error:', error);
    throw error;
  }
}

export async function streamChat(
  messages: ChatMessage[],
  model: Model,
  callbacks: StreamCallbacks
): Promise<void> {
  console.log('[StreamChat] Starting chat with model:', model.name);

  try {
    if (model.provider === 'anthropic') {
      await streamAnthropic(messages, model.id, callbacks);
    } else if (model.provider === 'openai') {
      await streamOpenAIStyle(
        `${BASE_URL}/v1/chat/completions`,
        { Authorization: `Bearer ${API_KEYS.openai}` },
        { model: model.id, messages, max_tokens: 4096 },
        callbacks
      );
    } else if (model.provider === 'xai') {
      await streamOpenAIStyle(
        `${BASE_URL}/v1/chat/completions`,
        { Authorization: `Bearer ${API_KEYS.xai}` },
        { model: model.id, messages, max_tokens: 4096 },
        callbacks
      );
    }
  } catch (error) {
    console.error('[StreamChat] Error:', error);
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function sendChatNonStreaming(
  messages: ChatMessage[],
  model: Model
): Promise<string> {
  console.log('[NonStreaming] Sending chat with model:', model.name);

  if (model.provider === 'anthropic') {
    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content.map(c => c.type === 'text' ? { type: 'text' as const, text: c.text || '' } : { type: 'text' as const, text: '' }),
      }));

    const systemMessage = messages.find(m => m.role === 'system');
    const systemText = typeof systemMessage?.content === 'string' ? systemMessage.content : undefined;

    const response = await fetch(`${BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEYS.anthropic,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model.id,
        messages: anthropicMessages,
        max_tokens: 4096,
        ...(systemText && { system: systemText }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic Error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  const headers = model.provider === 'openai'
    ? { Authorization: `Bearer ${API_KEYS.openai}` }
    : { Authorization: `Bearer ${API_KEYS.xai}` };

  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      model: model.id,
      messages,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
