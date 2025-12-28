/**
 * Mem0 Memory Service
 * Provides persistent memory for AI conversations
 * Uses REST API directly for cross-platform compatibility (web + native)
 */

const MEM0_API_KEY = 'm0-j5OCAdlNTk76AGVbTdEjKF22jCYjc7Q0yGLHCmQ9';
const MEM0_BASE_URL = 'https://api.mem0.ai/v1';

export interface MemoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Memory {
  id: string;
  memory: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface SearchResult {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

async function mem0Request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${MEM0_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Token ${MEM0_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mem0 API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Add memories from a conversation
 * @param messages - Array of conversation messages
 * @param userId - Unique identifier for the user
 * @param metadata - Optional metadata to attach to the memory
 */
export async function addMemory(
  messages: MemoryMessage[],
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    console.log('[Memory] Adding memory for user:', userId);
    console.log('[Memory] Messages count:', messages.length);

    await mem0Request('/memories/', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        user_id: userId,
        metadata,
      }),
    });

    console.log('[Memory] Memory added successfully');
  } catch (error) {
    console.error('[Memory] Error adding memory:', error);
    // Don't throw - memory is optional, shouldn't break the app
  }
}

/**
 * Search memories relevant to a query
 * @param query - The search query
 * @param userId - User ID to filter memories
 * @param limit - Maximum number of results
 */
export async function searchMemory(
  query: string,
  userId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    console.log('[Memory] Searching memories for user:', userId);
    console.log('[Memory] Query:', query.substring(0, 50) + '...');

    const results = await mem0Request('/memories/search/', {
      method: 'POST',
      body: JSON.stringify({
        query,
        user_id: userId,
        limit,
      }),
    });

    console.log('[Memory] Found memories:', results?.length || 0);

    return (results || []).map((r: any) => ({
      id: r.id,
      memory: r.memory,
      score: r.score,
      metadata: r.metadata,
    }));
  } catch (error) {
    console.error('[Memory] Error searching memory:', error);
    return [];
  }
}

/**
 * Get all memories for a user
 * @param userId - User ID to get memories for
 */
export async function getMemories(userId: string): Promise<Memory[]> {
  try {
    console.log('[Memory] Getting all memories for user:', userId);

    const results = await mem0Request(`/memories/?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
    });

    console.log('[Memory] Total memories:', results?.length || 0);

    return (results || []).map((r: any) => ({
      id: r.id,
      memory: r.memory,
      hash: r.hash,
      metadata: r.metadata,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (error) {
    console.error('[Memory] Error getting memories:', error);
    return [];
  }
}

/**
 * Delete a specific memory
 * @param memoryId - The ID of the memory to delete
 */
export async function deleteMemory(memoryId: string): Promise<boolean> {
  try {
    console.log('[Memory] Deleting memory:', memoryId);

    await mem0Request(`/memories/${memoryId}/`, {
      method: 'DELETE',
    });

    console.log('[Memory] Memory deleted successfully');
    return true;
  } catch (error) {
    console.error('[Memory] Error deleting memory:', error);
    return false;
  }
}

/**
 * Delete all memories for a user
 * @param userId - User ID to delete memories for
 */
export async function deleteAllMemories(userId: string): Promise<boolean> {
  try {
    console.log('[Memory] Deleting all memories for user:', userId);

    await mem0Request(`/memories/?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });

    console.log('[Memory] All memories deleted successfully');
    return true;
  } catch (error) {
    console.error('[Memory] Error deleting all memories:', error);
    return false;
  }
}

/**
 * Format memories as context for the AI
 * @param memories - Array of search results or memories
 * @returns Formatted string to include in system prompt
 */
export function formatMemoriesForContext(memories: SearchResult[] | Memory[]): string {
  if (!memories || memories.length === 0) {
    return '';
  }

  const memoryTexts = memories.map((m, i) => `${i + 1}. ${m.memory}`).join('\n');

  return `\n\n[User Memory - Things you remember about this user from past conversations:]
${memoryTexts}

Use this information to personalize your responses, but don't explicitly mention that you're using memory unless asked.`;
}
