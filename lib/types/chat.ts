export interface ImageAttachment {
  id: string;
  uri: string;
  base64?: string;
  width?: number;
  height?: number;
}

export interface FileAttachment {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  base64?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  images?: ImageAttachment[];
  files?: FileAttachment[];
  modelId?: string;
  createdAt: number;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  createdAt: number;
  updatedAt: number;
}
