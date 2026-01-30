/**
 * MessageBubble Component
 * Displays a single message in team chat with reactions and actions
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
  Alert,
  Pressable,
} from 'react-native';
import { XStack, YStack, Text, useTheme } from '@/shared/components/tamagui';
import { DotsThree, PencilSimple, Trash } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  TeamMessage,
  TeamMessageEmoji,
  TEAM_MESSAGE_EMOJI_MAP,
} from '../types';
import { ReactionPicker } from './ReactionPicker';

interface MessageBubbleProps {
  message: TeamMessage;
  isOwnMessage: boolean;
  onAddReaction: (emoji: TeamMessageEmoji) => void;
  onRemoveReaction: (emoji: TeamMessageEmoji) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

// Format message time
const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Format relative time for edited indicator
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return formatMessageTime(dateString);
};

export function MessageBubble({
  message,
  isOwnMessage,
  onAddReaction,
  onRemoveReaction,
  onEdit,
  onDelete,
  canEdit = false,
}: MessageBubbleProps) {
  const theme = useTheme();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 });
  const [showActions, setShowActions] = useState(false);

  const primaryColor = theme.primary?.val || '#3A5BA0';
  const mutedColor = theme.colorMuted.val;

  const name = message.sender_display_name || message.sender_username || 'User';
  const initials = name.slice(0, 2).toUpperCase();

  // Get current user's reactions for highlighting
  const myReactions = useMemo(
    () =>
      message.reactions
        .filter((r) => r.i_reacted)
        .map((r) => r.emoji),
    [message.reactions]
  );

  const handleLongPress = useCallback(
    (event: { nativeEvent: { pageX: number; pageY: number } }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setReactionPickerPosition({
        x: event.nativeEvent.pageX - 150,
        y: event.nativeEvent.pageY - 60,
      });
      setShowReactionPicker(true);
    },
    []
  );

  const handleReactionSelect = useCallback(
    (emoji: TeamMessageEmoji) => {
      const hasReacted = myReactions.includes(emoji);
      if (hasReacted) {
        onRemoveReaction(emoji);
      } else {
        onAddReaction(emoji);
      }
    },
    [myReactions, onAddReaction, onRemoveReaction]
  );

  const handleReactionPress = useCallback(
    (emoji: TeamMessageEmoji, hasReacted: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (hasReacted) {
        onRemoveReaction(emoji);
      } else {
        onAddReaction(emoji);
      }
    },
    [onAddReaction, onRemoveReaction]
  );

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  }, [onDelete]);

  // Deleted message
  if (message.is_deleted) {
    return (
      <XStack
        justifyContent={isOwnMessage ? 'flex-end' : 'flex-start'}
        paddingHorizontal="$3"
        paddingVertical="$1"
      >
        <View
          style={[
            styles.deletedBubble,
            { backgroundColor: theme.backgroundHover.val },
          ]}
        >
          <Text color="$colorMuted" fontSize="$3" fontStyle="italic">
            Message deleted
          </Text>
        </View>
      </XStack>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <XStack
        justifyContent={isOwnMessage ? 'flex-end' : 'flex-start'}
        paddingHorizontal="$3"
        paddingVertical="$1"
        gap="$2"
      >
        {/* Avatar (left side for others) */}
        {!isOwnMessage && (
          <View>
            {message.sender_avatar_url ? (
              <Image
                source={{ uri: message.sender_avatar_url }}
                style={[
                  styles.avatar,
                  { backgroundColor: theme.backgroundHover.val },
                ]}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: primaryColor }]}>
                <Text color="white" fontSize={10} fontWeight="600">
                  {initials}
                </Text>
              </View>
            )}
          </View>
        )}

        <YStack maxWidth="75%" gap="$1">
          {/* Sender name (for other users) */}
          {!isOwnMessage && (
            <Text fontSize="$2" fontWeight="500" color="$colorMuted">
              {name}
            </Text>
          )}

          {/* Message bubble */}
          <Pressable
            onLongPress={handleLongPress}
            delayLongPress={300}
            style={({ pressed }) => [
              styles.bubble,
              isOwnMessage
                ? { backgroundColor: primaryColor }
                : { backgroundColor: theme.backgroundHover.val },
              pressed && styles.bubblePressed,
            ]}
          >
            <Text
              color={isOwnMessage ? 'white' : '$color'}
              fontSize="$3"
              lineHeight={22}
            >
              {message.content}
            </Text>

            {/* Time and edited indicator */}
            <XStack justifyContent="flex-end" gap="$1" marginTop="$1">
              {message.edited_at && (
                <Text
                  fontSize={10}
                  color={isOwnMessage ? 'rgba(255,255,255,0.7)' : '$colorMuted'}
                >
                  edited
                </Text>
              )}
              <Text
                fontSize={10}
                color={isOwnMessage ? 'rgba(255,255,255,0.7)' : '$colorMuted'}
              >
                {formatMessageTime(message.created_at)}
              </Text>
            </XStack>
          </Pressable>

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <XStack flexWrap="wrap" gap="$1" marginTop="$0.5">
              {message.reactions.map((reaction) => (
                <TouchableOpacity
                  key={reaction.emoji}
                  onPress={() =>
                    handleReactionPress(reaction.emoji, reaction.i_reacted)
                  }
                  style={[
                    styles.reactionChip,
                    {
                      backgroundColor: reaction.i_reacted
                        ? theme.primaryMuted?.val || theme.backgroundHover.val
                        : theme.backgroundHover.val,
                      borderColor: reaction.i_reacted
                        ? primaryColor
                        : 'transparent',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text fontSize={14}>
                    {TEAM_MESSAGE_EMOJI_MAP[reaction.emoji]}
                  </Text>
                  <Text
                    fontSize={12}
                    color={reaction.i_reacted ? '$primary' : '$colorMuted'}
                    fontWeight={reaction.i_reacted ? '600' : '400'}
                    marginLeft={4}
                  >
                    {reaction.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </XStack>
          )}

          {/* Own message actions */}
          {isOwnMessage && (canEdit || onDelete) && (
            <XStack justifyContent="flex-end" gap="$2" marginTop="$0.5">
              {canEdit && onEdit && (
                <TouchableOpacity
                  onPress={onEdit}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <PencilSimple size={14} color={mutedColor} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  onPress={handleDeletePress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash size={14} color={mutedColor} />
                </TouchableOpacity>
              )}
            </XStack>
          )}
        </YStack>
      </XStack>

      {/* Reaction picker overlay */}
      {showReactionPicker && (
        <View style={StyleSheet.absoluteFill}>
          <ReactionPicker
            onSelectEmoji={handleReactionSelect}
            onClose={() => setShowReactionPicker(false)}
            currentReactions={myReactions}
          />
          <View
            style={[
              styles.pickerContainer,
              { left: reactionPickerPosition.x, top: reactionPickerPosition.y },
            ]}
          >
            <ReactionPicker
              onSelectEmoji={handleReactionSelect}
              onClose={() => setShowReactionPicker(false)}
              currentReactions={myReactions}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubblePressed: {
    opacity: 0.9,
  },
  deletedBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerContainer: {
    position: 'absolute',
  },
});
