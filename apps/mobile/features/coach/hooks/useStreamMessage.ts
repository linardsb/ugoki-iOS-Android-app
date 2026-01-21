import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useChatStore } from '../stores/chatStore';
import { getApiBaseUrl } from '@/shared/api/client';
import type { CoachPersonality } from '../types';

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
}

/**
 * Hook to send a streaming message to the AI coach.
 * Uses Server-Sent Events (SSE) to receive response chunks.
 */
export function useStreamMessage(options?: UseStreamMessageOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
  } = useChatStore();

  const sendMessage = useCallback(
    async (message: string, overridePersonality?: CoachPersonality) => {
      if (!identityId || !token) {
        setError('Not authenticated');
        return;
      }

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsLoading(true);
      setError(null);
      setStreaming(true);

      // Add user message to store
      addUserMessage(message);

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        const baseUrl = getApiBaseUrl();
        const url = `${baseUrl}/coach/stream`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: message,
            session_id: currentSessionId,
            personality: overridePersonality || personality,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Keep incomplete message in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const chunk: StreamChunk = JSON.parse(data);

                // Handle session info from first chunk
                if (chunk.session_id) {
                  setCurrentSession(chunk.session_id, chunk.conversation_title);
                }

                // Handle error
                if (chunk.error) {
                  setError(chunk.error);
                  break;
                }

                // Append text to streaming message
                if (chunk.text) {
                  appendToStreaming(chunk.text);
                }

                // Handle completion
                if (chunk.complete) {
                  finalizeStreaming();
                  options?.onComplete?.();
                }
              } catch (e) {
                console.error('Failed to parse SSE chunk:', e);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Request was cancelled, not an error
          return;
        }

        const errorMessage = err.message || 'Failed to send message';
        setError(errorMessage);
        options?.onError?.(errorMessage);

        // Finalize any partial streaming
        finalizeStreaming();
      } finally {
        setIsLoading(false);
        setStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [
      identityId,
      token,
      currentSessionId,
      personality,
      addUserMessage,
      appendToStreaming,
      finalizeStreaming,
      setCurrentSession,
      setStreaming,
      options,
    ]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
