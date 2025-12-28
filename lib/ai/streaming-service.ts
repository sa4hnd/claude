import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { searchMemory, addMemory, formatMemoriesForContext, type MemoryMessage } from './memory-service';

const BASE_URL = 'https://epidermoid-stefani-legatine.ngrok-free.dev';

const API_KEYS = {
  openai: 'sk-proj-anielepohng9eing5Ol6Phex3oin9geg-n0tr3al',
  anthropic: 'sk-ant-api03-gu2gohc4sha1Thohpeep7ro9vie1ikai-n0tr3al',
  xai: 'xai-ahDi8ofei1Em2chaichoac2Beehi8thu-n0tr3al',
};

const streamingFetch = Platform.OS === 'web' ? fetch : expoFetch;

// Cache for uploaded file IDs (fileUri -> file_id)
const uploadedFileCache = new Map<string, string>();

// Upload file to OpenAI Files API and return file_id
async function uploadFileToOpenAI(fileUri: string, filename: string, mimeType: string, base64Data?: string): Promise<string | null> {
  try {
    if (uploadedFileCache.has(fileUri)) {
      console.log('[OpenAI Files] Using cached file_id for:', filename);
      return uploadedFileCache.get(fileUri)!;
    }

    console.log('[OpenAI Files] Uploading file:', filename, 'platform:', Platform.OS);

    if (Platform.OS !== 'web') {
      console.log('[OpenAI Files] PDF upload not supported on native - use Claude for PDF analysis');
      return null;
    }

    if (!base64Data) {
      console.error('[OpenAI Files] No base64 data provided for upload');
      return null;
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('purpose', 'user_data');

    const response = await fetch(`${BASE_URL}/v1/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.openai}`,
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[OpenAI Files] Upload successful, file_id:', data.id);
      uploadedFileCache.set(fileUri, data.id);
      return data.id;
    } else {
      const errorText = await response.text();
      console.error('[OpenAI Files] Upload failed:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('[OpenAI Files] Upload error:', error);
    return null;
  }
}

export type ModelProvider = 'openai' | 'anthropic' | 'xai';

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  supportsImages: boolean;
  contextWindow: number;
  supportsReasoning?: boolean;
}

export const AVAILABLE_MODELS: Model[] = [
  { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'openai', supportsImages: true, contextWindow: 128000, supportsReasoning: true },
  { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'openai', supportsImages: true, contextWindow: 128000, supportsReasoning: true },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', supportsImages: true, contextWindow: 128000 },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic', supportsImages: true, contextWindow: 200000, supportsReasoning: true },
  { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', provider: 'anthropic', supportsImages: true, contextWindow: 200000, supportsReasoning: true },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic', supportsImages: true, contextWindow: 200000, supportsReasoning: true },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', supportsImages: true, contextWindow: 200000 },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic', supportsImages: true, contextWindow: 200000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', supportsImages: true, contextWindow: 128000 },
  { id: 'o1', name: 'o1', provider: 'openai', supportsImages: true, contextWindow: 200000, supportsReasoning: true },
  { id: 'o1-mini', name: 'o1 Mini', provider: 'openai', supportsImages: true, contextWindow: 128000, supportsReasoning: true },
  { id: 'grok-3', name: 'Grok 3', provider: 'xai', supportsImages: false, contextWindow: 131072, supportsReasoning: true },
  { id: 'grok-3-mini', name: 'Grok 3 Mini', provider: 'xai', supportsImages: false, contextWindow: 131072, supportsReasoning: true },
  { id: 'grok-4', name: 'Grok 4', provider: 'xai', supportsImages: false, contextWindow: 131072, supportsReasoning: true },
  { id: 'grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'xai', supportsImages: false, contextWindow: 131072, supportsReasoning: true },
  { id: 'grok-3-beta', name: 'Grok 3 Beta', provider: 'xai', supportsImages: false, contextWindow: 131072, supportsReasoning: true },
  { id: 'grok-3-mini-beta', name: 'Grok 3 Mini Beta', provider: 'xai', supportsImages: false, contextWindow: 131072, supportsReasoning: true },
  { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', provider: 'xai', supportsImages: true, contextWindow: 131072 },
];

export interface MessageContent {
  type: 'text' | 'image_url' | 'document';
  text?: string;
  image_url?: { url: string };
  document?: { url: string; name?: string; mimeType?: string; fileUri?: string };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onThinking?: (token: string) => void;
  onComplete: (fullText: string, thinking?: string) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

// Parser state for extracting <thinking> tags from streamed content
interface ThinkingParserState {
  inThinking: boolean;
  buffer: string;
  thinkingBuffer: string;
}

function createThinkingParser(): {
  state: ThinkingParserState;
  parse: (chunk: string) => { content: string; thinking: string };
} {
  const state: ThinkingParserState = {
    inThinking: false,
    buffer: '',
    thinkingBuffer: '',
  };

  return {
    state,
    parse: (chunk: string) => {
      let content = '';
      let thinking = '';

      state.buffer += chunk;

      while (state.buffer.length > 0) {
        if (state.inThinking) {
          // Look for closing tag
          const closeIdx = state.buffer.indexOf('</thinking>');
          if (closeIdx !== -1) {
            // Found closing tag
            thinking += state.buffer.substring(0, closeIdx);
            state.buffer = state.buffer.substring(closeIdx + 11); // 11 = '</thinking>'.length
            state.inThinking = false;
          } else {
            // No closing tag yet - check if we might have partial tag
            const partialClose = state.buffer.match(/<\/t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?$/);
            if (partialClose) {
              // Keep potential partial tag in buffer
              thinking += state.buffer.substring(0, partialClose.index);
              state.buffer = state.buffer.substring(partialClose.index!);
              break;
            } else {
              // No partial tag, consume all as thinking
              thinking += state.buffer;
              state.buffer = '';
            }
          }
        } else {
          // Look for opening tag
          const openIdx = state.buffer.indexOf('<thinking>');
          if (openIdx !== -1) {
            // Found opening tag - output content before it
            content += state.buffer.substring(0, openIdx);
            state.buffer = state.buffer.substring(openIdx + 10); // 10 = '<thinking>'.length
            state.inThinking = true;
          } else {
            // No opening tag - check for partial tag
            const partialOpen = state.buffer.match(/<(?:t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?)?$/);
            if (partialOpen) {
              // Keep potential partial tag in buffer
              content += state.buffer.substring(0, partialOpen.index);
              state.buffer = state.buffer.substring(partialOpen.index!);
              break;
            } else {
              // No partial tag, consume all as content
              content += state.buffer;
              state.buffer = '';
            }
          }
        }
      }

      return { content, thinking };
    },
  };
}

interface ParsedSSE {
  content?: string;
  thinking?: string;
}

function parseSSELine(line: string): ParsedSSE | null {
  if (line.startsWith('data: ')) {
    const data = line.slice(6);
    if (data === '[DONE]') return null;
    try {
      const parsed = JSON.parse(data);
      const result: ParsedSSE = {};
      if (parsed.choices?.[0]?.delta?.content) {
        result.content = parsed.choices[0].delta.content;
      }
      if (parsed.choices?.[0]?.delta?.reasoning_content) {
        result.thinking = parsed.choices[0].delta.reasoning_content;
      }
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        result.content = parsed.delta.text;
      }
      if (parsed.type === 'content_block_delta' && parsed.delta?.thinking) {
        result.thinking = parsed.delta.thinking;
      }
      if (result.content || result.thinking) return result;
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
  let fullThinking = '';
  let buffer = '';

  // Create thinking parser for <thinking> tags in content
  const thinkingParser = createThinkingParser();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const parsed = parseSSELine(line.trim());
        if (parsed) {
          // First check for native thinking support (reasoning_content)
          if (parsed.thinking && callbacks.onThinking) {
            fullThinking += parsed.thinking;
            callbacks.onThinking(parsed.thinking);
          }

          // Parse content for <thinking> tags
          if (parsed.content) {
            const { content, thinking } = thinkingParser.parse(parsed.content);
            if (content) {
              fullText += content;
              callbacks.onToken(content);
            }
            if (thinking && callbacks.onThinking) {
              fullThinking += thinking;
              callbacks.onThinking(thinking);
            }
          }
        }
      }
    }

    if (buffer.trim()) {
      const parsed = parseSSELine(buffer.trim());
      if (parsed) {
        if (parsed.thinking && callbacks.onThinking) {
          fullThinking += parsed.thinking;
          callbacks.onThinking(parsed.thinking);
        }
        if (parsed.content) {
          const { content, thinking } = thinkingParser.parse(parsed.content);
          if (content) {
            fullText += content;
            callbacks.onToken(content);
          }
          if (thinking && callbacks.onThinking) {
            fullThinking += thinking;
            callbacks.onThinking(thinking);
          }
        }
      }
    }

    callbacks.onComplete(fullText, fullThinking || undefined);
    console.log('[Streaming] Stream completed, total length:', fullText.length, 'thinking:', fullThinking.length);
  } catch (error) {
    console.error('[Streaming] Stream error:', error);
    throw error;
  }
}

async function streamAnthropic(
  messages: ChatMessage[],
  model: string,
  callbacks: StreamCallbacks,
  webSearchEnabled?: boolean
): Promise<void> {
  console.log('[Streaming] Starting Anthropic stream with model:', model);
  console.log('[Streaming] Messages count:', messages.length);

  // Debug: Log content types in messages
  messages.forEach((m, i) => {
    if (typeof m.content !== 'string' && Array.isArray(m.content)) {
      const types = m.content.map(c => c.type);
      console.log(`[Streaming] Message ${i} (${m.role}) content types:`, types);
      m.content.forEach((c, j) => {
        if (c.type === 'document' && c.document) {
          console.log(`[Streaming] Message ${i} content ${j}: document name=${c.document.name}, mimeType=${c.document.mimeType}, urlLength=${c.document.url?.length}`);
        }
      });
    }
  });

  if (webSearchEnabled) {
    console.log('[Streaming] Web search tool enabled');
  }

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
        if (c.type === 'document' && c.document) {
          const url = c.document.url;
          console.log('[Streaming] Processing document:', c.document.name, 'url starts with data:', url?.startsWith('data:'));
          if (url && url.startsWith('data:')) {
            const [meta, data] = url.split(',');
            const mediaType = meta.split(':')[1].split(';')[0];
            console.log('[Streaming] Anthropic document block:', c.document.name, 'mediaType:', mediaType, 'data length:', data?.length);
            return {
              type: 'document' as const,
              source: {
                type: 'base64' as const,
                media_type: mediaType,
                data: data,
              },
            };
          } else {
            console.error('[Streaming] Document URL is invalid or missing:', c.document.name, 'url:', url?.substring(0, 50));
          }
        }
        return null; // Return null for invalid/unhandled content
      }).filter((c): c is NonNullable<typeof c> => c !== null && (c.type !== 'text' || (c as any).text !== ''));
      return { role: m.role, content };
    });

  // Debug: Log the anthropic messages structure
  console.log('[Streaming] Anthropic messages prepared, count:', anthropicMessages.length);
  anthropicMessages.forEach((m, i) => {
    if (Array.isArray(m.content)) {
      const types = m.content.map((c: any) => c.type);
      console.log(`[Streaming] Anthropic message ${i} (${m.role}) content types:`, types);
    }
  });

  const systemMessage = messages.find(m => m.role === 'system');
  const systemText = typeof systemMessage?.content === 'string' ? systemMessage.content : undefined;

  // Check if model supports extended thinking
  const modelInfo = AVAILABLE_MODELS.find(m => m.id === model);
  const supportsThinking = modelInfo?.supportsReasoning ?? false;

  console.log('[Streaming] Anthropic endpoint:', `${BASE_URL}/v1/messages`);
  console.log('[Streaming] Anthropic request model:', model);
  console.log('[Streaming] Extended thinking enabled:', supportsThinking);

  const requestBody: Record<string, unknown> = {
    model,
    messages: anthropicMessages,
    max_tokens: 64000,
    stream: true,
    ...(systemText && { system: systemText }),
  };

  // Enable extended thinking for models that support it
  if (supportsThinking) {
    requestBody.thinking = {
      type: 'enabled',
      budget_tokens: 16000,
    };
  }

  // Add web search tool if enabled
  if (webSearchEnabled) {
    requestBody.tools = [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      }
    ];
  }

  // Check if any message has document content
  const hasDocuments = anthropicMessages.some((m: any) =>
    Array.isArray(m.content) && m.content.some((c: any) => c.type === 'document')
  );

  const response = await streamingFetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEYS.anthropic,
      'anthropic-version': '2023-06-01',
      // PDF support requires beta header
      ...(hasDocuments && { 'anthropic-beta': 'pdfs-2024-09-25' }),
    },
    body: JSON.stringify(requestBody),
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
  let fullThinking = '';
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
            // Handle content_block_delta events
            if (parsed.type === 'content_block_delta') {
              // Check delta type for proper extended thinking support
              if (parsed.delta?.type === 'thinking_delta' && parsed.delta?.thinking && callbacks.onThinking) {
                // Native extended thinking - thinking_delta type
                fullThinking += parsed.delta.thinking;
                callbacks.onThinking(parsed.delta.thinking);
              } else if (parsed.delta?.type === 'text_delta' && parsed.delta?.text) {
                // Regular text content - text_delta type
                fullText += parsed.delta.text;
                callbacks.onToken(parsed.delta.text);
              }
            }
          } catch {
            continue;
          }
        }
      }
    }

    callbacks.onComplete(fullText, fullThinking || undefined);
    console.log('[Streaming] Anthropic stream completed');
  } catch (error) {
    console.error('[Streaming] Anthropic stream error:', error);
    throw error;
  }
}

// Helper to decode base64 text content for text files
function decodeBase64Text(base64Url: string): string | null {
  try {
    // Extract base64 data
    const [, data] = base64Url.split(',');
    if (!data) return null;

    // Decode base64 to text
    const decoded = atob(data);
    return decoded;
  } catch (error) {
    console.error('[StreamChat] Error decoding base64 text:', error);
    return null;
  }
}

// Convert messages with document types for OpenAI
// OpenAI requires uploading files first via Files API, then referencing by file_id
async function convertMessagesForOpenAI(messages: ChatMessage[]): Promise<ChatMessage[]> {
  const convertedMessages: ChatMessage[] = [];

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      convertedMessages.push(msg);
      continue;
    }

    // Convert document content blocks for OpenAI format
    const convertedContent: any[] = [];

    for (const c of msg.content) {
      if (c.type === 'document' && c.document) {
        const mimeType = c.document.mimeType || 'application/octet-stream';
        const textMimeTypes = ['text/plain', 'text/csv', 'application/json', 'text/markdown', 'text/html', 'text/xml'];

        // For text files, decode and include as text content
        if (textMimeTypes.includes(mimeType)) {
          const textContent = decodeBase64Text(c.document.url);
          if (textContent) {
            console.log('[StreamChat] Decoded text file for OpenAI:', c.document.name, 'length:', textContent.length);
            convertedContent.push({
              type: 'text' as const,
              text: `[Content of ${c.document.name || 'file'}]:\n${textContent}\n[End of file content]`
            });
            continue;
          }
        }

        // For PDFs - upload to OpenAI Files API first, then reference by file_id
        if (mimeType === 'application/pdf') {
          // Extract base64 data from the URL for web uploads
          let base64Data: string | undefined;
          if (c.document.url && c.document.url.startsWith('data:')) {
            const [, data] = c.document.url.split(',');
            base64Data = data;
          }

          // Use fileUri if available, or base64 data for web
          if (c.document.fileUri || base64Data) {
            console.log('[StreamChat] PDF file for OpenAI - uploading first:', c.document.name);
            const fileId = await uploadFileToOpenAI(
              c.document.fileUri || c.document.url,
              c.document.name || 'document.pdf',
              mimeType,
              base64Data
            );

            if (fileId) {
              convertedContent.push({
                type: 'file',
                file: {
                  file_id: fileId,
                }
              });
              continue;
            } else {
              const isNative = Platform.OS !== 'web';
              convertedContent.push({
                type: 'text' as const,
                text: isNative
                  ? `[PDF file: ${c.document.name || 'document.pdf'} - PDF analysis with GPT is not supported on mobile. Please switch to a Claude model for PDF analysis.]`
                  : `[PDF file: ${c.document.name || 'document.pdf'} - Upload failed. Please try again.]`
              });
              continue;
            }
          } else {
            console.log('[StreamChat] PDF file missing fileUri and base64 data:', c.document.name);
            convertedContent.push({
              type: 'text' as const,
              text: `[PDF file: ${c.document.name || 'document.pdf'} - Cannot upload, missing file reference. Please use Claude for PDF analysis.]`
            });
            continue;
          }
        }

        // For other binary files, return a placeholder message
        console.log('[StreamChat] Unsupported file type for OpenAI:', c.document.name, mimeType);
        convertedContent.push({
          type: 'text' as const,
          text: `[File attached: ${c.document.name || 'unknown'} (${mimeType}). This file type is not supported for direct analysis with this model. Please use Claude for PDF analysis.]`
        });
      } else {
        convertedContent.push(c);
      }
    }

    convertedMessages.push({ ...msg, content: convertedContent });
  }

  return convertedMessages;
}

export async function streamChat(
  messages: ChatMessage[],
  model: Model,
  callbacks: StreamCallbacks,
  userId?: string,
  webSearchEnabled?: boolean
): Promise<void> {
  console.log('[StreamChat] Starting chat with model:', model.name);
  if (webSearchEnabled) {
    console.log('[StreamChat] Web search enabled');
  }

  let messagesWithMemory = messages;

  // If userId is provided, search for relevant memories and add to context
  if (userId) {
    try {
      // Get the last user message for memory search
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      const userQuery = typeof lastUserMessage?.content === 'string'
        ? lastUserMessage.content
        : lastUserMessage?.content?.find(c => c.type === 'text')?.text || '';

      if (userQuery) {
        console.log('[StreamChat] Searching memories for user:', userId);
        const memories = await searchMemory(userQuery, userId, 5);

        if (memories.length > 0) {
          const memoryContext = formatMemoriesForContext(memories);
          console.log('[StreamChat] Found', memories.length, 'relevant memories');

          // Add memory context to system message
          const systemMessageIndex = messages.findIndex(m => m.role === 'system');
          if (systemMessageIndex !== -1) {
            const existingSystem = messages[systemMessageIndex];
            const existingContent = typeof existingSystem.content === 'string'
              ? existingSystem.content
              : existingSystem.content?.find(c => c.type === 'text')?.text || '';
            messagesWithMemory = [...messages];
            messagesWithMemory[systemMessageIndex] = {
              ...existingSystem,
              content: existingContent + memoryContext,
            };
          } else {
            // Add new system message with memory context
            messagesWithMemory = [
              { role: 'system', content: `You are a helpful AI assistant.${memoryContext}` },
              ...messages,
            ];
          }
        }
      }
    } catch (error) {
      console.error('[StreamChat] Memory search error:', error);
      // Continue without memory if there's an error
    }
  }

  try {
    if (model.provider === 'anthropic') {
      await streamAnthropic(messagesWithMemory, model.id, callbacks, webSearchEnabled);
    } else if (model.provider === 'openai') {
      // For OpenAI Chat Completions, web search requires using specialized search models
      // Map regular models to their search variants when web search is enabled
      let modelId = model.id;
      if (webSearchEnabled) {
        const searchModelMap: Record<string, string> = {
          'gpt-4o': 'gpt-4o-search-preview',
          'gpt-4o-mini': 'gpt-4o-mini-search-preview',
          'gpt-5.1': 'gpt-5-search-api',
          'gpt-5.2': 'gpt-5-search-api',
        };
        if (searchModelMap[model.id]) {
          modelId = searchModelMap[model.id];
          console.log('[StreamChat] Using OpenAI search model:', modelId);
        } else {
          console.log('[StreamChat] Web search not available for this OpenAI model:', model.id);
        }
      }

      // Convert document content blocks to text for OpenAI (it doesn't support document type)
      const convertedMessages = await convertMessagesForOpenAI(messagesWithMemory);
      console.log('[StreamChat] Converted messages for OpenAI, count:', convertedMessages.length);

      const requestBody: Record<string, unknown> = {
        model: modelId,
        messages: convertedMessages,
        max_completion_tokens: 64000,
      };

      await streamOpenAIStyle(
        `${BASE_URL}/v1/chat/completions`,
        { Authorization: `Bearer ${API_KEYS.openai}` },
        requestBody,
        callbacks
      );
    } else if (model.provider === 'xai') {
      // Convert document content blocks to text for xAI (it doesn't support document type)
      const convertedMessages = await convertMessagesForOpenAI(messagesWithMemory);

      await streamOpenAIStyle(
        `${BASE_URL}/v1/chat/completions`,
        { Authorization: `Bearer ${API_KEYS.xai}` },
        { model: model.id, messages: convertedMessages, max_completion_tokens: 64000 },
        callbacks
      );
    }

    // After successful completion, save the conversation to memory
    if (userId) {
      try {
        // Get the last exchange (user message + assistant response)
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
          const userContent = typeof lastUserMsg.content === 'string'
            ? lastUserMsg.content
            : lastUserMsg.content?.find(c => c.type === 'text')?.text || '';

          // Note: We'll add memory in ChatProvider after we get the full response
          console.log('[StreamChat] Conversation will be saved to memory by ChatProvider');
        }
      } catch (memError) {
        console.error('[StreamChat] Error preparing memory save:', memError);
      }
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
        max_tokens: 64000,
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
      max_completion_tokens: 64000,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
