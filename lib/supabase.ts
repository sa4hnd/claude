import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

// Hardcoded Supabase credentials - DO NOT USE ENV VARIABLES
const SUPABASE_URL = "https://hecyfnjahvmcegtunvdq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3lmbmphaHZtY2VndHVudmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzY1MjcsImV4cCI6MjA3NjgxMjUyN30.p9r2XHdgZ51WumLTEfDJdobWZhBGS3qIejF2UvTij80";

// Memory storage for SSR - acts as a fallback when window/localStorage isn't available
const memoryStorage: { [key: string]: string } = {};
const createMemoryStorage = () => ({
  getItem: (key: string) => memoryStorage[key] ?? null,
  setItem: (key: string, value: string) => { memoryStorage[key] = value; },
  removeItem: (key: string) => { delete memoryStorage[key]; },
});

// Get appropriate storage based on platform and environment
const getStorage = () => {
  // Check if we're on web and window exists (client-side)
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    // SSR fallback
    return createMemoryStorage();
  }
  // Native platforms - use AsyncStorage dynamically to avoid SSR issues
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    return AsyncStorage;
  } catch {
    return createMemoryStorage();
  }
};
const storage = getStorage();

// Initialize Supabase client with platform-appropriate storage
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          model_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          model_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          model_id?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          images: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          images?: any | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          images?: any | null;
        };
      };
    };
  };
};
