/**
 * Team Messaging Hooks (Sprint 4)
 * React Query hooks for team chat operations
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';

import { api } from '@/shared/api/client';
import {
  TeamMessage,
  TeamMessagePage,
  TeamUnreadCount,
  TeamReadReceipt,
  TeamMemberForMention,
  TeamMessageEmoji,
  SendTeamMessageParams,
  EditTeamMessageParams,
  AddReactionParams,
  MarkTeamReadParams,
} from '../types';
import { teamKeys } from './useTeamChallenges';

// =========================================================================
// Query Keys
// =========================================================================

export const messageKeys = {
  all: ['team-messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (teamId: string) => [...messageKeys.lists(), teamId] as const,
  unread: () => [...messageKeys.all, 'unread'] as const,
  readReceipts: () => [...messageKeys.all, 'read-receipts'] as const,
  readReceipt: (teamId: string) => [...messageKeys.readReceipts(), teamId] as const,
  mentions: () => [...messageKeys.all, 'mentions'] as const,
  mentionMembers: (teamId: string) => [...messageKeys.mentions(), teamId] as const,
};

// =========================================================================
// Query Hooks
// =========================================================================

/**
 * Get paginated team messages with infinite scroll support
 */
export function useTeamMessages(teamId: string, enabled: boolean = true) {
  return useInfiniteQuery({
    queryKey: messageKeys.list(teamId),
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string | number> = { limit: 50 };
      if (pageParam) {
        params.before = pageParam;
      }
      const { data } = await api.get<TeamMessagePage>(
        `/social/teams/${teamId}/messages`,
        { params }
      );
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    enabled: !!teamId && enabled,
    staleTime: 30 * 1000, // 30 seconds - messages can update frequently
    refetchInterval: 30 * 1000, // Poll every 30 seconds for new messages
  });
}

/**
 * Get unread message counts for all teams (poll every minute)
 */
export function useTeamUnreadCounts(enabled: boolean = true) {
  return useQuery({
    queryKey: messageKeys.unread(),
    queryFn: async () => {
      const { data } = await api.get<TeamUnreadCount[]>('/social/teams/unread');
      return data;
    },
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Poll every minute
  });
}

/**
 * Get read receipts for a team
 */
export function useTeamReadReceipts(teamId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: messageKeys.readReceipt(teamId),
    queryFn: async () => {
      const { data } = await api.get<TeamReadReceipt[]>(
        `/social/teams/${teamId}/read-receipts`
      );
      return data;
    },
    enabled: !!teamId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get team members for @mention autocomplete
 */
export function useTeamMentionMembers(
  teamId: string,
  query?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [...messageKeys.mentionMembers(teamId), query],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (query) {
        params.query = query;
      }
      const { data } = await api.get<TeamMemberForMention[]>(
        `/social/teams/${teamId}/members/mention`,
        { params }
      );
      return data;
    },
    enabled: !!teamId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - team membership doesn't change often
  });
}

// =========================================================================
// Mutation Hooks
// =========================================================================

/**
 * Send a message to a team chat with optimistic update
 */
export function useSendTeamMessage(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendTeamMessageParams) => {
      const { data } = await api.post<TeamMessage>(
        `/social/teams/${teamId}/messages`,
        params
      );
      return data;
    },
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: messageKeys.list(teamId) });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(messageKeys.list(teamId));

      // Optimistically add the new message (will be at the start since newest first)
      queryClient.setQueryData(
        messageKeys.list(teamId),
        (old: { pages: TeamMessagePage[] } | undefined) => {
          if (!old) return old;
          const optimisticMessage: TeamMessage = {
            id: `temp-${Date.now()}`,
            team_id: teamId,
            sender_id: 'me', // Will be corrected on server response
            sender_username: null,
            sender_display_name: null,
            sender_avatar_url: null,
            content: newMessage.content,
            created_at: new Date().toISOString(),
            edited_at: null,
            is_deleted: false,
            reactions: [],
            mentions: newMessage.mentions || [],
          };
          return {
            ...old,
            pages: old.pages.map((page, index) =>
              index === 0
                ? { ...page, messages: [optimisticMessage, ...page.messages] }
                : page
            ),
          };
        }
      );

      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(messageKeys.list(teamId), context.previousMessages);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: messageKeys.list(teamId) });
      queryClient.invalidateQueries({ queryKey: messageKeys.unread() });
    },
  });
}

/**
 * Edit a message (within 15-min window)
 */
export function useEditTeamMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      params,
    }: {
      messageId: string;
      params: EditTeamMessageParams;
    }) => {
      const { data } = await api.patch<TeamMessage>(
        `/social/teams/messages/${messageId}`,
        params
      );
      return data;
    },
    onSuccess: (updatedMessage) => {
      // Invalidate the team's messages
      queryClient.invalidateQueries({
        queryKey: messageKeys.list(updatedMessage.team_id),
      });
    },
  });
}

/**
 * Delete a message (soft delete, sender only)
 */
export function useDeleteTeamMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, teamId }: { messageId: string; teamId: string }) => {
      await api.delete(`/social/teams/messages/${messageId}`);
      return { messageId, teamId };
    },
    onSuccess: (result) => {
      // Invalidate the team's messages
      queryClient.invalidateQueries({
        queryKey: messageKeys.list(result.teamId),
      });
    },
  });
}

/**
 * Add a reaction to a message
 */
export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: TeamMessageEmoji;
    }) => {
      const { data } = await api.post<TeamMessage>(
        `/social/teams/messages/${messageId}/reactions`,
        { emoji }
      );
      return data;
    },
    onSuccess: (updatedMessage) => {
      // Invalidate the team's messages
      queryClient.invalidateQueries({
        queryKey: messageKeys.list(updatedMessage.team_id),
      });
    },
  });
}

/**
 * Remove a reaction from a message
 */
export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: TeamMessageEmoji;
    }) => {
      const { data } = await api.delete<TeamMessage>(
        `/social/teams/messages/${messageId}/reactions/${emoji}`
      );
      return data;
    },
    onSuccess: (updatedMessage) => {
      // Invalidate the team's messages
      queryClient.invalidateQueries({
        queryKey: messageKeys.list(updatedMessage.team_id),
      });
    },
  });
}

/**
 * Toggle a reaction (add if not present, remove if present)
 */
export function useToggleReaction() {
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  return {
    mutate: (params: { messageId: string; emoji: TeamMessageEmoji; hasReacted: boolean }) => {
      if (params.hasReacted) {
        removeReaction.mutate({ messageId: params.messageId, emoji: params.emoji });
      } else {
        addReaction.mutate({ messageId: params.messageId, emoji: params.emoji });
      }
    },
    isPending: addReaction.isPending || removeReaction.isPending,
  };
}

/**
 * Mark team messages as read
 */
export function useMarkTeamRead(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: MarkTeamReadParams) => {
      await api.post(`/social/teams/${teamId}/read`, params || {});
      return teamId;
    },
    onSuccess: () => {
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: messageKeys.unread() });
      // Invalidate read receipts
      queryClient.invalidateQueries({ queryKey: messageKeys.readReceipt(teamId) });
    },
  });
}

// =========================================================================
// Convenience Hooks
// =========================================================================

/**
 * Get total unread count across all teams
 */
export function useTotalUnreadCount() {
  const { data: unreadCounts } = useTeamUnreadCounts();
  return unreadCounts?.reduce((total, team) => total + team.unread_count, 0) ?? 0;
}

/**
 * Get unread count for a specific team
 */
export function useTeamUnreadCount(teamId: string) {
  const { data: unreadCounts } = useTeamUnreadCounts();
  return unreadCounts?.find((team) => team.team_id === teamId)?.unread_count ?? 0;
}
