import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import createContextHook from '@nkzw/create-context-hook';
import { Conversation, Message, ImageAttachment, FileAttachment } from '@/lib/types/chat';
import { Model, AVAILABLE_MODELS, streamChat, ChatMessage, MessageContent } from '@/lib/ai/streaming-service';
import { addMemory, type MemoryMessage } from '@/lib/ai/memory-service';
import { storage } from '@/lib/storage';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const STORAGE_KEY = 'ai_chat_conversations';
const SELECTED_MODEL_KEY = 'ai_chat_selected_model';
const BATCH_INTERVAL_MS = 16;
const HAPTIC_INTERVAL_MS = 80;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateTitle(firstMessage: string): string {
  const cleanMessage = firstMessage.trim();
  if (cleanMessage.length <= 30) return cleanMessage;
  return cleanMessage.substring(0, 30) + '...';
}

// Convert Supabase conversation to app format
function supabaseToConversation(conv: any, messages: any[]): Conversation {
  return {
    id: conv.id,
    title: conv.title,
    messages: messages.map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      images: msg.images,
      createdAt: new Date(msg.created_at).getTime(),
      isStreaming: false,
    })),
    modelId: conv.model_id,
    createdAt: new Date(conv.created_at).getTime(),
    updatedAt: new Date(conv.updated_at).getTime(),
  };
}

export const [ChatProvider, useChat] = createContextHook(() => {
  const { isAuthenticated, user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model>(AVAILABLE_MODELS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThinking, setStreamingThinking] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const batchBufferRef = useRef<string>('');
  const thinkingBufferRef = useRef<string>('');
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHapticRef = useRef<number>(0);
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamingConversationIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingMessageIdsRef = useRef<Set<string>>(new Set());

  const triggerStreamingHaptic = useCallback(() => {
    if (Platform.OS === 'web') return;
    const now = Date.now();
    if (now - lastHapticRef.current >= HAPTIC_INTERVAL_MS) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      lastHapticRef.current = now;
    }
  }, []);

  // Load conversations from Supabase
  const loadSupabaseConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('[ChatProvider] Loading conversations from Supabase...');
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (convError) {
        console.error('[ChatProvider] Failed to load conversations:', convError);
        return;
      }

      if (!convData || convData.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Load messages for each conversation
      const conversationsWithMessages: Conversation[] = [];
      for (const conv of convData) {
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('[ChatProvider] Failed to load messages for conversation:', conv.id, msgError);
          continue;
        }

        conversationsWithMessages.push(supabaseToConversation(conv, msgData || []));
      }

      setConversations(conversationsWithMessages);
      console.log('[ChatProvider] Loaded', conversationsWithMessages.length, 'conversations from Supabase');
    } catch (error) {
      console.error('[ChatProvider] Failed to load Supabase conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Set up realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Subscribe to conversation changes
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[ChatProvider] Conversation change:', payload.eventType);
          // Reload conversations on changes
          loadSupabaseConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('[ChatProvider] Message change:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            if (pendingMessageIdsRef.current.has(newMsg.id)) {
              console.log('[ChatProvider] Ignoring realtime update for pending message:', newMsg.id);
              return;
            }
            if (streamingMessageIdRef.current === newMsg.id) {
              console.log('[ChatProvider] Ignoring realtime update for streaming message:', newMsg.id);
              return;
            }
            setConversations(prev => prev.map(conv => {
              if (conv.id === newMsg.conversation_id) {
                if (conv.messages.some(m => m.id === newMsg.id)) {
                  return conv;
                }
                return {
                  ...conv,
                  messages: [...conv.messages, {
                    id: newMsg.id,
                    role: newMsg.role,
                    content: newMsg.content,
                    images: newMsg.images,
                    createdAt: new Date(newMsg.created_at).getTime(),
                    isStreaming: false,
                  }],
                };
              }
              return conv;
            }));
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, loadSupabaseConversations]);

  // Load data based on authentication state
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadSupabaseConversations();
    } else if (!isAuthenticated) {
      loadLocalData();
    }
  }, [isAuthenticated, user?.id, loadSupabaseConversations]);

  // Save to local storage when not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading && conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations, isLoading, isAuthenticated]);

  const loadLocalData = async () => {
    try {
      console.log('[ChatProvider] Loading data from local storage...');
      const [storedConversations, storedModelId] = await Promise.all([
        storage.getItem(STORAGE_KEY),
        storage.getItem(SELECTED_MODEL_KEY),
      ]);

      if (storedConversations) {
        const parsed = JSON.parse(storedConversations) as Conversation[];
        setConversations(parsed);
        console.log('[ChatProvider] Loaded', parsed.length, 'conversations');
      }

      if (storedModelId) {
        const model = AVAILABLE_MODELS.find(m => m.id === storedModelId);
        if (model) {
          setSelectedModel(model);
          console.log('[ChatProvider] Loaded model:', model.name);
        }
      }
    } catch (error) {
      console.error('[ChatProvider] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversations = async (data: Conversation[]) => {
    try {
      await storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[ChatProvider] Failed to save conversations:', error);
    }
  };

  const changeModel = useCallback(async (model: Model) => {
    setSelectedModel(model);
    await storage.setItem(SELECTED_MODEL_KEY, model.id);
    console.log('[ChatProvider] Model changed to:', model.name);
  }, []);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  const createConversation = useCallback(async (): Promise<string> => {
    const newConversation: Conversation = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      modelId: selectedModel.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (isAuthenticated && user?.id) {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            title: 'New Chat',
            model_id: selectedModel.id,
          })
          .select()
          .single();

        if (error) throw error;

        newConversation.id = data.id;
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(data.id);
        console.log('[ChatProvider] Created conversation in Supabase:', data.id);
        return data.id;
      } catch (error) {
        console.error('[ChatProvider] Failed to create conversation in Supabase:', error);
        // Fallback to local
      }
    }

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    console.log('[ChatProvider] Created new conversation:', newConversation.id);
    return newConversation.id;
  }, [selectedModel.id, isAuthenticated, user?.id]);

  const deleteConversation = useCallback(async (id: string) => {
    if (isAuthenticated && user?.id) {
      try {
        // Delete messages first (foreign key constraint)
        await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', id);

        // Delete conversation
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
        console.log('[ChatProvider] Deleted conversation from Supabase:', id);
        return;
      } catch (error) {
        console.error('[ChatProvider] Failed to delete conversation from Supabase:', error);
      }
    }

    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    console.log('[ChatProvider] Deleted conversation:', id);
  }, [activeConversationId, isAuthenticated, user?.id]);

  const clearAllConversations = useCallback(async () => {
    if (isAuthenticated && user?.id) {
      try {
        // Delete all messages for user's conversations
        for (const conv of conversations) {
          await supabase
            .from('messages')
            .delete()
            .eq('conversation_id', conv.id);
        }

        // Delete all conversations
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (error) {
        console.error('[ChatProvider] Failed to clear conversations from Supabase:', error);
      }
    }
    setConversations([]);
    setActiveConversationId(null);
    await storage.removeItem(STORAGE_KEY);
    console.log('[ChatProvider] Cleared all conversations');
  }, [conversations, isAuthenticated, user?.id]);

  const sendMessage = useCallback(async (
    content: string,
    images?: ImageAttachment[],
    files?: FileAttachment[]
  ): Promise<void> => {
    let conversationId = activeConversationId;

    if (!conversationId) {
      conversationId = await createConversation();
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      images,
      files,
      createdAt: Date.now(),
    };

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      modelId: selectedModel.id,
      createdAt: Date.now(),
      isStreaming: true,
    };

    pendingMessageIdsRef.current.add(userMessage.id);
    pendingMessageIdsRef.current.add(assistantMessage.id);

    // Optimistic update
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const isFirstMessage = conv.messages.length === 0;
        return {
          ...conv,
          title: isFirstMessage ? generateTitle(content) : conv.title,
          messages: [...conv.messages, userMessage, assistantMessage],
          updatedAt: Date.now(),
        };
      }
      return conv;
    }));

    // Save to Supabase if authenticated
    if (isAuthenticated && user?.id) {
      try {
        // Add user message
        const { data: userMsgData, error: userMsgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'user',
            content,
            images,
          })
          .select()
          .single();

        if (userMsgError) throw userMsgError;

        pendingMessageIdsRef.current.delete(userMessage.id);
        pendingMessageIdsRef.current.add(userMsgData.id);

        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg =>
                msg.id === userMessage.id ? { ...msg, id: userMsgData.id } : msg
              ),
            };
          }
          return conv;
        }));
        userMessage.id = userMsgData.id;

        // Update conversation title if first message
        const conv = conversations.find(c => c.id === conversationId);
        if (conv && conv.messages.length === 0) {
          await supabase
            .from('conversations')
            .update({
              title: generateTitle(content),
              updated_at: new Date().toISOString(),
            })
            .eq('id', conversationId);
        }

        // Add assistant message placeholder
        const { data: assistantMsgData, error: assistantMsgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: '',
          })
          .select()
          .single();

        if (assistantMsgError) throw assistantMsgError;

        pendingMessageIdsRef.current.delete(assistantMessage.id);
        pendingMessageIdsRef.current.add(assistantMsgData.id);

        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg =>
                msg.id === assistantMessage.id ? { ...msg, id: assistantMsgData.id } : msg
              ),
            };
          }
          return conv;
        }));
        assistantMessage.id = assistantMsgData.id;
        streamingMessageIdRef.current = assistantMsgData.id;
        streamingConversationIdRef.current = conversationId;
      } catch (error) {
        console.error('[ChatProvider] Failed to save message to Supabase:', error);
      }
    }

    setIsStreaming(true);
    setStreamingContent('');
    setStreamingThinking('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const conversation = conversations.find(c => c.id === conversationId);
    const allMessages = conversation ? [...conversation.messages, userMessage] : [userMessage];

    const chatMessages: ChatMessage[] = allMessages.map(msg => {
      const hasImages = msg.images && msg.images.length > 0 && selectedModel.supportsImages;
      const hasFiles = msg.files && msg.files.length > 0;

      if (hasImages || hasFiles) {
        const contentArray: MessageContent[] = [
          { type: 'text', text: msg.content }
        ];
        if (hasImages && msg.images) {
          msg.images.forEach(img => {
            if (img.base64) {
              contentArray.push({
                type: 'image_url',
                image_url: { url: img.base64 }
              });
            }
          });
        }
        if (hasFiles && msg.files) {
          console.log('[ChatProvider] Processing', msg.files.length, 'files for message');
          msg.files.forEach(file => {
            if (file.base64) {
              console.log('[ChatProvider] Adding file to message:', file.name, 'mimeType:', file.mimeType, 'base64 length:', file.base64.length, 'uri:', file.uri);
              contentArray.push({
                type: 'document',
                document: {
                  url: file.base64,
                  name: file.name,
                  mimeType: file.mimeType,
                  fileUri: file.uri  // Pass original file URI for OpenAI file upload
                }
              });
            } else {
              console.log('[ChatProvider] File has no base64 data:', file.name);
            }
          });
        }
        return { role: msg.role, content: contentArray };
      }
      return { role: msg.role, content: msg.content };
    });

    let fullResponse = '';
    let fullThinking = '';
    batchBufferRef.current = '';
    thinkingBufferRef.current = '';
    let rafId: number | null = null;

    const flushBatch = () => {
      const currentContent = batchBufferRef.current;
      const currentThinking = thinkingBufferRef.current;
      if (currentContent || currentThinking) {
        setStreamingContent(currentContent);
        setStreamingThinking(currentThinking);
        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: currentContent, thinking: currentThinking || undefined }
                  : msg
              ),
            };
          }
          return conv;
        }));
      }
      rafId = null;
    };

    const scheduleFlush = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(flushBatch);
      }
    };

    try {
      // Get the memory user ID (use authenticated user email or a local ID)
      const memoryUserId = user?.email || 'local_user';

      await streamChat(chatMessages, selectedModel, {
        onToken: (token) => {
          fullResponse += token;
          batchBufferRef.current = fullResponse;
          triggerStreamingHaptic();
          scheduleFlush();
        },
        onThinking: (token) => {
          fullThinking += token;
          thinkingBufferRef.current = fullThinking;
          scheduleFlush();
        },
        onComplete: async (text, thinking) => {
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          flushBatch();

          console.log('[ChatProvider] Stream completed, length:', text.length, 'thinking:', thinking?.length || 0);
          abortControllerRef.current = null;

          setConversations(prev => prev.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: text, thinking: thinking || undefined, isStreaming: false }
                    : msg
                ),
                updatedAt: Date.now(),
              };
            }
            return conv;
          }));

          if (isAuthenticated && streamingMessageIdRef.current) {
            try {
              await supabase
                .from('messages')
                .update({ content: text })
                .eq('id', streamingMessageIdRef.current);

              await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', conversationId);
            } catch (error) {
              console.error('[ChatProvider] Failed to update message in Supabase:', error);
            }
          }

          // Save conversation to Mem0 memory
          try {
            const memoryMessages: MemoryMessage[] = [
              { role: 'user', content },
              { role: 'assistant', content: text },
            ];
            await addMemory(memoryMessages, memoryUserId, {
              conversationId,
              model: selectedModel.name,
            });
            console.log('[ChatProvider] Memory saved successfully');
          } catch (memError) {
            console.error('[ChatProvider] Failed to save memory:', memError);
          }

          pendingMessageIdsRef.current.delete(userMessage.id);
          pendingMessageIdsRef.current.delete(assistantMessage.id);
          streamingMessageIdRef.current = null;
          streamingConversationIdRef.current = null;
        },
        onError: (error) => {
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }

          const isAbortError = error.name === 'AbortError' ||
            error.message?.includes('FetchRequestCanceledException') ||
            error.message?.includes('aborted');

          if (isAbortError) {
            console.log('[ChatProvider] Stream aborted by user');
            // Clean up the assistant message if nothing was streamed
            setConversations(prev => prev.map(conv => {
              if (conv.id === conversationId) {
                const currentContent = batchBufferRef.current;
                return {
                  ...conv,
                  messages: conv.messages.map(msg => {
                    if (msg.id === assistantMessage.id) {
                      // If we have some content, keep it; otherwise remove the message
                      if (currentContent) {
                        return { ...msg, isStreaming: false };
                      }
                      return null; // Mark for removal
                    }
                    return msg;
                  }).filter((msg): msg is Message => msg !== null),
                };
              }
              return conv;
            }));
            pendingMessageIdsRef.current.delete(assistantMessage.id);
            streamingMessageIdRef.current = null;
            streamingConversationIdRef.current = null;
            return;
          }

          console.error('[ChatProvider] Stream error:', error);
          abortControllerRef.current = null;

          setConversations(prev => prev.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: `Error: ${error.message}`, isStreaming: false }
                    : msg
                ),
              };
            }
            return conv;
          }));

          pendingMessageIdsRef.current.delete(userMessage.id);
          pendingMessageIdsRef.current.delete(assistantMessage.id);
          streamingMessageIdRef.current = null;
          streamingConversationIdRef.current = null;
        },
        signal: abortController.signal,
      }, memoryUserId, webSearchEnabled);
    } catch (error) {
      console.error('[ChatProvider] Send message error:', error);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingThinking('');
      abortControllerRef.current = null;
    }
  }, [activeConversationId, conversations, selectedModel, createConversation, triggerStreamingHaptic, isAuthenticated, user?.id, user?.email, webSearchEnabled]);

  const stopStreaming = useCallback(async () => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          messages: conv.messages.map(msg =>
            msg.isStreaming ? { ...msg, isStreaming: false } : msg
          ),
        };
      }
      return conv;
    }));

    // Update in Supabase
    if (isAuthenticated && streamingMessageIdRef.current) {
      try {
        await supabase
          .from('messages')
          .update({ content: batchBufferRef.current || '' })
          .eq('id', streamingMessageIdRef.current);
      } catch (error) {
        console.error('[ChatProvider] Failed to update message in Supabase:', error);
      }
    }

    setIsStreaming(false);
    setStreamingContent('');
    setStreamingThinking('');
    streamingMessageIdRef.current = null;
    streamingConversationIdRef.current = null;
    console.log('[ChatProvider] Streaming stopped by user');
  }, [activeConversationId, isAuthenticated]);

  const retryMessage = useCallback((assistantMessageId: string) => {
    if (!activeConversationId || isStreaming) return;

    const conversation = conversations.find(c => c.id === activeConversationId);
    if (!conversation) return;

    const assistantMsgIndex = conversation.messages.findIndex(m => m.id === assistantMessageId);
    if (assistantMsgIndex === -1 || assistantMsgIndex === 0) return;

    const userMessage = conversation.messages[assistantMsgIndex - 1];
    if (userMessage.role !== 'user') return;

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          messages: conv.messages.slice(0, assistantMsgIndex),
          updatedAt: Date.now(),
        };
      }
      return conv;
    }));

    setTimeout(() => {
      sendMessage(userMessage.content, userMessage.images);
    }, 100);
  }, [activeConversationId, conversations, isStreaming, sendMessage]);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    selectedModel,
    setSelectedModel: changeModel,
    changeModel,
    isLoading,
    isStreaming,
    streamingContent,
    streamingThinking,
    webSearchEnabled,
    setWebSearchEnabled,
    createConversation,
    deleteConversation,
    clearAllConversations,
    sendMessage,
    stopStreaming,
    retryMessage,
    availableModels: AVAILABLE_MODELS,
  };
});
