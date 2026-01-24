import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/shared/stores/storage';
import type { ChatMessage, CoachPersonality, QuickAction } from '../types';

interface Conversation {
  sessionId: string;
  title: string | null;
  lastMessageAt: string;
  messageCount: number;
}

interface ChatState {
  // Current conversation
  currentSessionId: string | null;
  messages: ChatMessage[];
  streamingMessage: string; // For streaming responses

  // Settings
  personality: CoachPersonality;
  quickActions: QuickAction[];
  isTyping: boolean;
  isStreaming: boolean;

  // Conversation list
  conversations: Conversation[];

  // Actions
  addUserMessage: (content: string) => ChatMessage;
  addAssistantMessage: (content: string) => ChatMessage;
  appendToStreaming: (text: string) => void;
  finalizeStreaming: () => void;
  setQuickActions: (actions: QuickAction[]) => void;
  setPersonality: (personality: CoachPersonality) => void;
  setTyping: (isTyping: boolean) => void;
  setStreaming: (isStreaming: boolean) => void;
  setCurrentSession: (sessionId: string | null, title?: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  clearMessages: () => void;
  startNewConversation: () => void;
}

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      messages: [],
      streamingMessage: '',
      personality: 'motivational',
      quickActions: [],
      isTyping: false,
      isStreaming: false,
      conversations: [],

      addUserMessage: (content) => {
        const message: ChatMessage = {
          id: generateId(),
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, message],
        }));
        return message;
      },

      addAssistantMessage: (content) => {
        const message: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, message],
          isTyping: false,
          isStreaming: false,
          streamingMessage: '',
        }));
        return message;
      },

      appendToStreaming: (text) => {
        set((state) => ({
          streamingMessage: state.streamingMessage + text,
          isStreaming: true,
        }));
      },

      finalizeStreaming: () => {
        const { streamingMessage, addAssistantMessage } = get();
        if (streamingMessage) {
          addAssistantMessage(streamingMessage);
        }
        set({ streamingMessage: '', isStreaming: false });
      },

      setQuickActions: (actions) => {
        set({ quickActions: actions });
      },

      setPersonality: (personality) => {
        set({ personality });
      },

      setTyping: (isTyping) => {
        set({ isTyping });
      },

      setStreaming: (isStreaming) => {
        set({ isStreaming });
      },

      setCurrentSession: (sessionId, title = null) => {
        set({ currentSessionId: sessionId });
        // Update conversation list if title provided
        if (sessionId && title) {
          set((state) => {
            const existing = state.conversations.find(c => c.sessionId === sessionId);
            if (existing) {
              return {
                conversations: state.conversations.map(c =>
                  c.sessionId === sessionId
                    ? { ...c, title, lastMessageAt: new Date().toISOString() }
                    : c
                ),
              };
            }
            return {
              conversations: [
                {
                  sessionId,
                  title,
                  lastMessageAt: new Date().toISOString(),
                  messageCount: 0,
                },
                ...state.conversations,
              ],
            };
          });
        }
      },

      setConversations: (conversations) => {
        set({ conversations });
      },

      clearMessages: () => {
        set({
          currentSessionId: null, // Reset session to start fresh conversation
          messages: [],
          quickActions: [],
          streamingMessage: '',
          isTyping: false,
          isStreaming: false,
        });
      },

      startNewConversation: () => {
        set({
          currentSessionId: null,
          messages: [],
          streamingMessage: '',
          quickActions: [],
          isTyping: false,
          isStreaming: false,
        });
      },
    }),
    {
      name: 'coach-chat-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        messages: state.messages.slice(-50), // Keep last 50 messages
        personality: state.personality,
        conversations: state.conversations.slice(0, 20), // Keep last 20 conversations
      }),
    }
  )
);
