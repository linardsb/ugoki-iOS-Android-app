/**
 * TeamChat Component
 * Main team chat interface with messages, input, and reactions
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { YStack, Text, useTheme } from '@/shared/components/tamagui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useTeamMessages,
  useTeamMentionMembers,
  useSendTeamMessage,
  useEditTeamMessage,
  useDeleteTeamMessage,
  useAddReaction,
  useRemoveReaction,
  useMarkTeamRead,
} from '../hooks';
import { TeamMessage, TeamMessageEmoji } from '../types';
import { MessageBubble } from './MessageBubble';
import { MentionInput } from './MentionInput';

interface TeamChatProps {
  teamId: string;
  teamName?: string;
}

// Edit window in milliseconds (15 minutes)
const EDIT_WINDOW_MS = 15 * 60 * 1000;

export function TeamChat({ teamId, teamName }: TeamChatProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const flashListRef = useRef<FlashList<TeamMessage>>(null);

  const [messageText, setMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Queries
  const {
    data: messagesData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useTeamMessages(teamId);

  const { data: mentionMembers = [], isLoading: isLoadingMembers } =
    useTeamMentionMembers(teamId);

  // Mutations
  const sendMessage = useSendTeamMessage(teamId);
  const editMessage = useEditTeamMessage();
  const deleteMessage = useDeleteTeamMessage();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const markRead = useMarkTeamRead(teamId);

  // Flatten paginated messages
  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  // Mark as read when entering chat
  useEffect(() => {
    if (messages.length > 0) {
      markRead.mutate({ last_read_message_id: messages[0].id });
    }
  }, [messages.length > 0]);

  // Load more messages
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Send message
  const handleSend = useCallback(
    (mentions: string[]) => {
      if (!messageText.trim()) return;

      if (editingMessageId) {
        // Edit existing message
        editMessage.mutate(
          { messageId: editingMessageId, params: { content: messageText } },
          {
            onSuccess: () => {
              setMessageText('');
              setEditingMessageId(null);
            },
            onError: (error) => {
              Alert.alert('Error', error.message || 'Failed to edit message');
            },
          }
        );
      } else {
        // Send new message
        sendMessage.mutate(
          { content: messageText, mentions },
          {
            onSuccess: () => {
              setMessageText('');
              // Scroll to top (newest message)
              flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
            },
            onError: (error) => {
              Alert.alert('Error', error.message || 'Failed to send message');
            },
          }
        );
      }
    },
    [messageText, editingMessageId, sendMessage, editMessage]
  );

  // Start editing a message
  const handleStartEdit = useCallback((message: TeamMessage) => {
    setEditingMessageId(message.id);
    setMessageText(message.content);
  }, []);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setMessageText('');
  }, []);

  // Delete message
  const handleDelete = useCallback(
    (messageId: string) => {
      deleteMessage.mutate(
        { messageId, teamId },
        {
          onError: (error) => {
            Alert.alert('Error', error.message || 'Failed to delete message');
          },
        }
      );
    },
    [teamId, deleteMessage]
  );

  // Add reaction
  const handleAddReaction = useCallback(
    (messageId: string, emoji: TeamMessageEmoji) => {
      addReaction.mutate(
        { messageId, emoji },
        {
          onError: (error) => {
            Alert.alert('Error', error.message || 'Failed to add reaction');
          },
        }
      );
    },
    [addReaction]
  );

  // Remove reaction
  const handleRemoveReaction = useCallback(
    (messageId: string, emoji: TeamMessageEmoji) => {
      removeReaction.mutate(
        { messageId, emoji },
        {
          onError: (error) => {
            Alert.alert('Error', error.message || 'Failed to remove reaction');
          },
        }
      );
    },
    [removeReaction]
  );

  // Check if message can still be edited
  const canEditMessage = useCallback(
    (message: TeamMessage) => {
      if (message.sender_id !== user?.id) return false;
      const createdAt = new Date(message.created_at).getTime();
      const now = Date.now();
      return now - createdAt < EDIT_WINDOW_MS;
    },
    [user?.id]
  );

  // Render message item
  const renderMessage = useCallback(
    ({ item }: { item: TeamMessage }) => (
      <MessageBubble
        message={item}
        isOwnMessage={item.sender_id === user?.id}
        onAddReaction={(emoji) => handleAddReaction(item.id, emoji)}
        onRemoveReaction={(emoji) => handleRemoveReaction(item.id, emoji)}
        onEdit={
          canEditMessage(item) ? () => handleStartEdit(item) : undefined
        }
        onDelete={
          item.sender_id === user?.id
            ? () => handleDelete(item.id)
            : undefined
        }
        canEdit={canEditMessage(item)}
      />
    ),
    [
      user?.id,
      handleAddReaction,
      handleRemoveReaction,
      handleStartEdit,
      handleDelete,
      canEditMessage,
    ]
  );

  // Empty state
  const renderEmpty = useCallback(
    () => (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$6">
        <Text fontSize="$5" fontWeight="500" color="$colorMuted" textAlign="center">
          No messages yet
        </Text>
        <Text fontSize="$3" color="$colorMuted" textAlign="center" marginTop="$2">
          Start the conversation with your team!
        </Text>
      </YStack>
    ),
    []
  );

  // Loading state
  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <ActivityIndicator size="large" color={theme.primary?.val} />
        <Text color="$colorMuted" marginTop="$3">
          Loading messages...
        </Text>
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Editing indicator */}
      {editingMessageId && (
        <View
          style={[
            styles.editingBanner,
            { backgroundColor: theme.primaryMuted?.val || theme.backgroundHover.val },
          ]}
        >
          <Text color="$primary" fontSize="$2" fontWeight="500">
            Editing message
          </Text>
          <Text
            color="$primary"
            fontSize="$2"
            fontWeight="600"
            onPress={handleCancelEdit}
          >
            Cancel
          </Text>
        </View>
      )}

      {/* Messages list (inverted for chat) */}
      <View style={styles.listContainer}>
        <FlashList
          ref={flashListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          estimatedItemSize={80}
          inverted
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={theme.primary?.val} />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* Message input */}
      <MentionInput
        value={messageText}
        onChangeText={setMessageText}
        onSend={handleSend}
        members={mentionMembers}
        isLoadingMembers={isLoadingMembers}
        isSending={sendMessage.isPending || editMessage.isPending}
        placeholder={editingMessageId ? 'Edit your message...' : 'Type a message...'}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
