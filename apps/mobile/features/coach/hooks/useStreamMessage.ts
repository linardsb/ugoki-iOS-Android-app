import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useChatStore } from '../stores/chatStore';
import { getApiBaseUrl } from '@/shared/api/client';
import type { CoachPersonality } from '../types';
import EventSource from 'react-native-sse';

interface StreamChunk {
  text: string;
  session_id?: string;
  conversation_title?: string;
  complete: boolean;
  error?: string;
}

interface UseStreamMessageOptions {
  onComplete?: () => void;
  onError?: (error: string) => void;
  /** Delay in ms between revealing characters (default: 15ms for natural typing feel) */
  typingDelay?: number;
}

/**
 * Hook to send a streaming message to the AI coach.
 * Uses Server-Sent Events (SSE) via react-native-sse for React Native compatibility.
 */
// Default typing delay in milliseconds (18ms = ~55 chars/sec)
const DEFAULT_TYPING_DELAY = 18;

export function useStreamMessage(options?: UseStreamMessageOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Typing animation refs
  const textBufferRef = useRef<string>('');
  const displayedIndexRef = useRef<number>(0);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCompleteRef = useRef<boolean>(false);
  const typingDelay = options?.typingDelay ?? DEFAULT_TYPING_DELAY;

  const identityId = useAuthStore((state) => state.identity?.id);
  const token = useAuthStore((state) => state.accessToken);

  const {
    currentSessionId,
    personality,
    addUserMessage,
    appendToStreaming,
    finalizeStreaming,
    setCurrentSession,
    setStreaming,
    isStreaming: storeIsStreaming,
  } = useChatStore();

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  // Stop typing animation and close connection if chat is cleared (isStreaming becomes false externally)
  useEffect(() => {
    if (!storeIsStreaming) {
      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      // Stop typing animation
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      // Reset buffer state
      textBufferRef.current = '';
      displayedIndexRef.current = 0;
      isCompleteRef.current = false;
      setIsLoading(false);
    }
  }, [storeIsStreaming]);

  // Process the text buffer character by character
  const processTypingBuffer = useCallback(() => {
    if (displayedIndexRef.current < textBufferRef.current.length) {
      // Reveal next character
      const nextChar = textBufferRef.current[displayedIndexRef.current];
      appendToStreaming(nextChar);
      displayedIndexRef.current++;

      // Schedule next character
      typingTimerRef.current = setTimeout(processTypingBuffer, typingDelay);
    } else if (isCompleteRef.current) {
      // Buffer is empty and stream is complete - finalize
      finalizeStreaming();
      setIsLoading(false);
      setStreaming(false);
      options?.onComplete?.();
    }
    // If buffer is empty but not complete, we'll resume when more text arrives
  }, [appendToStreaming, finalizeStreaming, setStreaming, typingDelay, options]);

  // Add text to buffer and start typing if not already running
  const addToBuffer = useCallback((text: string) => {
    textBufferRef.current += text;

    // Start typing animation if not already running
    if (!typingTimerRef.current) {
      processTypingBuffer();
    }
  }, [processTypingBuffer]);

  const sendMessage = useCallback(
    async (message: string, overridePersonality?: CoachPersonality) => {
      console.log('[Coach] sendMessage called, identityId:', identityId, 'token:', token ? 'present' : 'missing');

      if (!identityId || !token) {
        const errorMsg = 'Not authenticated - please log in first';
        console.error('[Coach] Auth check failed:', errorMsg);
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return;
      }

      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsLoading(true);
      setError(null);
      setStreaming(true);

      // Reset typing animation state
      textBufferRef.current = '';
      displayedIndexRef.current = 0;
      isCompleteRef.current = false;
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }

      // Add user message to store
      addUserMessage(message);

      try {
        const baseUrl = getApiBaseUrl();
        const url = `${baseUrl}/coach/stream`;
        console.log('[Coach] Connecting to SSE:', url);

        // Create EventSource with POST request
        const es = new EventSource(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          method: 'POST',
          body: JSON.stringify({
            message: message,
            session_id: currentSessionId,
            personality: overridePersonality || personality,
          }),
        });

        eventSourceRef.current = es;

        es.addEventListener('open', () => {
          console.log('[Coach] SSE connection opened');
        });

        es.addEventListener('message', (event: any) => {
          if (!event.data) return;

          try {
            const chunk: StreamChunk = JSON.parse(event.data);
            console.log('[Coach] Received chunk:', chunk.text?.substring(0, 30) || '(empty)', 'complete:', chunk.complete);

            // Handle session info from first chunk
            if (chunk.session_id) {
              setCurrentSession(chunk.session_id, chunk.conversation_title);
            }

            // Handle error
            if (chunk.error) {
              console.error('[Coach] Server error:', chunk.error);
              setError(chunk.error);
              es.close();
              eventSourceRef.current = null;
              setIsLoading(false);
              setStreaming(false);
              options?.onError?.(chunk.error);
              return;
            }

            // Add text to typing buffer (will be revealed character by character)
            if (chunk.text) {
              addToBuffer(chunk.text);
            }

            // Handle completion - mark complete but let typing animation finish
            if (chunk.complete) {
              console.log('[Coach] Stream complete, waiting for typing animation to finish');
              isCompleteRef.current = true;
              es.close();
              eventSourceRef.current = null;
              // Don't finalize here - let processTypingBuffer handle it when buffer is empty
            }
          } catch (e) {
            console.error('[Coach] Failed to parse SSE chunk:', e, 'data:', event.data);
          }
        });

        es.addEventListener('error', (event: any) => {
          console.error('[Coach] SSE error:', event);
          const errorMessage = event.message || 'Connection failed';
          setError(errorMessage);
          options?.onError?.(errorMessage);

          // Finalize any partial streaming
          finalizeStreaming();
          es.close();
          eventSourceRef.current = null;
          setIsLoading(false);
          setStreaming(false);
        });

      } catch (err: any) {
        console.error('[Coach] Exception:', err);
        const errorMessage = err.message || 'Failed to send message';
        setError(errorMessage);
        options?.onError?.(errorMessage);

        // Finalize any partial streaming
        finalizeStreaming();
        setIsLoading(false);
        setStreaming(false);
      }
    },
    [
      identityId,
      token,
      currentSessionId,
      personality,
      addUserMessage,
      addToBuffer,
      finalizeStreaming,
      setCurrentSession,
      setStreaming,
      options,
    ]
  );

  const cancel = useCallback(() => {
    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    // Stop typing animation
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    // Reset buffer state
    textBufferRef.current = '';
    displayedIndexRef.current = 0;
    isCompleteRef.current = false;

    setIsLoading(false);
    setStreaming(false);
    finalizeStreaming();
  }, [finalizeStreaming, setStreaming]);

  return {
    sendMessage,
    cancel,
    isLoading,
    error,
  };
}
