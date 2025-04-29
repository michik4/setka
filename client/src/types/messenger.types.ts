import { User } from './user.types';

export interface Message {
  id: number;
  content: string;
  sender: User;
  senderId: number;
  conversationId: number;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: number;
  name: string | null;
  isGroup: boolean;
  participants: User[];
  lastMessageId: number | null;
  createdAt: string;
  updatedAt: string;
  avatarUrl: string | null;
  lastMessage?: Message;
}

export interface MessengerState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Record<number, Message[]>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  unreadCounts: Record<number, number>;
  error: string | null;
}

export interface MessengerContextType {
  state: MessengerState;
  getConversations: () => Promise<void>;
  createConversation: (userIds: number[], name?: string, isGroup?: boolean) => Promise<Conversation | null>;
  getMessages: (conversationId: number, limit?: number, offset?: number) => Promise<Message[]>;
  sendMessage: (conversationId: number, content: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  markMessagesAsRead: (conversationId: number) => Promise<void>;
  getUnreadCounts: () => Promise<Record<number, number>>;
} 