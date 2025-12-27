import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// Hardcoded Supabase credentials - DO NOT USE ENV VARIABLES
const SUPABASE_URL = "https://hecyfnjahvmcegtunvdq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3lmbmphaHZtY2VndHVudmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzY1MjcsImV4cCI6MjA3NjgxMjUyN30.p9r2XHdgZ51WumLTEfDJdobWZhBGS3qIejF2UvTij80";

// Create storage adapter based on platform
const createStorageAdapter = () => {
  if (Platform.OS === "web") {
    // Web uses localStorage by default, return undefined to use Supabase's default
    return undefined;
  }

  // For native, we need to dynamically import AsyncStorage
  // But we'll use a simple in-memory fallback that persists via the storage.ts
  const storage: { [key: string]: string } = {};
  return {
    getItem: async (key: string) => {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        return await AsyncStorage.getItem(key);
      } catch {
        return storage[key] || null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem(key, value);
      } catch {
        storage[key] = value;
      }
    },
    removeItem: async (key: string) => {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.removeItem(key);
      } catch {
        delete storage[key];
      }
    },
  };
};

// Initialize Supabase client with hardcoded credentials
export const supabase = createClient(
  "https://hecyfnjahvmcegtunvdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3lmbmphaHZtY2VndHVudmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzY1MjcsImV4cCI6MjA3NjgxMjUyN30.p9r2XHdgZ51WumLTEfDJdobWZhBGS3qIejF2UvTij80",
  {
    auth: {
      storage: createStorageAdapter(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
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
