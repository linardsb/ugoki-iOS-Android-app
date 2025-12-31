/**
 * Friends Hooks
 * React Query hooks for friend management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-client';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type {
  Friendship,
  FriendRequest,
  SendFriendRequestParams,
  RespondFriendRequestParams,
} from '../types';

// =========================================================================
// Friends List
// =========================================================================

export function useFriends() {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.friends(),
    queryFn: async (): Promise<Friendship[]> => {
      const response = await apiClient.get('/social/friends', {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

// =========================================================================
// Friend Requests
// =========================================================================

export function useIncomingFriendRequests() {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.incomingRequests(),
    queryFn: async (): Promise<FriendRequest[]> => {
      const response = await apiClient.get('/social/friends/requests/incoming', {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

export function useOutgoingFriendRequests() {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.outgoingRequests(),
    queryFn: async (): Promise<FriendRequest[]> => {
      const response = await apiClient.get('/social/friends/requests/outgoing', {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

// =========================================================================
// Friend Actions
// =========================================================================

export function useSendFriendRequest() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendFriendRequestParams): Promise<Friendship> => {
      const response = await apiClient.post('/social/friends/request', params, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.friends() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.outgoingRequests() });
    },
  });
}

export function useRespondToFriendRequest() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      accept,
    }: {
      requestId: string;
      accept: boolean;
    }): Promise<Friendship | null> => {
      const response = await apiClient.post(
        `/social/friends/requests/${requestId}/respond`,
        { accept },
        { params: { identity_id: identity?.id } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.friends() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.incomingRequests() });
    },
  });
}

export function useRemoveFriend() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string): Promise<void> => {
      await apiClient.delete(`/social/friends/${friendId}`, {
        params: { identity_id: identity?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.friends() });
    },
  });
}

export function useBlockUser() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      await apiClient.post(`/social/friends/${userId}/block`, null, {
        params: { identity_id: identity?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.all });
    },
  });
}

export function useUnblockUser() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      await apiClient.delete(`/social/friends/${userId}/block`, {
        params: { identity_id: identity?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.all });
    },
  });
}

// =========================================================================
// Helper: Get pending request count
// =========================================================================

export function useFriendRequestCount() {
  const { data: requests } = useIncomingFriendRequests();
  return requests?.length ?? 0;
}
