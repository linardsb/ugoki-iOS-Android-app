// Coach feature exports

// Types
export * from './types';

// Hooks
export {
  useSendMessage,
  useCoachContext,
  useDailyInsight,
  useMotivation,
  useSetPersonality,
} from './hooks';

// Components
export {
  ChatBubble,
  ChatInput,
  TypingIndicator,
  QuickActions,
  WelcomeMessage,
} from './components';

// Stores
export { useChatStore } from './stores';
