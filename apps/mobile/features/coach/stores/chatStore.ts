import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/shared/stores/storage';
import type { ChatMessage, CoachPersonality, QuickAction } from '../types';

interface ChatState {
  messages: ChatMessage[];
  personality: CoachPersonality;
  quickActions: QuickAction[];
  isTyping: boolean;

  // Actions
  addUserMessage: (content: string) => ChatMessage;
  addAssistantMessage: (content: string) => ChatMessage;
  setQuickActions: (actions: QuickAction[]) => void;
  setPersonality: (personality: CoachPersonality) => void;
  setTyping: (isTyping: boolean) => void;
  clearMessages: () => void;
}

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      personality: 'motivational',
      quickActions: [],
      isTyping: false,

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
        }));
        return message;
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

      clearMessages: () => {
        set({ messages: [], quickActions: [] });
      },
    }),
    {
      name: 'coach-chat-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        messages: state.messages.slice(-50), // Keep last 50 messages
        personality: state.personality,
      }),
    }
  )
);
