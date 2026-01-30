/**
 * ReactionPicker Component
 * Emoji reaction picker popup for team messages
 */

import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { XStack, Text, useTheme } from '@/shared/components/tamagui';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  TeamMessageEmoji,
  TEAM_MESSAGE_EMOJI_MAP,
  TEAM_MESSAGE_EMOJI_LIST,
} from '../types';

interface ReactionPickerProps {
  onSelectEmoji: (emoji: TeamMessageEmoji) => void;
  onClose: () => void;
  currentReactions?: TeamMessageEmoji[];
}

export function ReactionPicker({
  onSelectEmoji,
  onClose,
  currentReactions = [],
}: ReactionPickerProps) {
  const theme = useTheme();

  const handleSelectEmoji = useCallback(
    (emoji: TeamMessageEmoji) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectEmoji(emoji);
      onClose();
    },
    [onSelectEmoji, onClose]
  );

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Picker */}
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(100)}
        style={[
          styles.picker,
          {
            backgroundColor: theme.cardBackground.val,
            borderColor: theme.cardBorder.val,
            shadowColor: theme.color.val,
          },
        ]}
      >
        <XStack gap="$2" padding="$2">
          {TEAM_MESSAGE_EMOJI_LIST.map((emoji) => {
            const hasReacted = currentReactions.includes(emoji);
            return (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleSelectEmoji(emoji)}
                style={[
                  styles.emojiButton,
                  hasReacted && {
                    backgroundColor: theme.primaryMuted?.val || theme.backgroundHover.val,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text fontSize={24}>{TEAM_MESSAGE_EMOJI_MAP[emoji]}</Text>
              </TouchableOpacity>
            );
          })}
        </XStack>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  picker: {
    position: 'absolute',
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
