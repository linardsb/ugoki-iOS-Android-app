/**
 * MentionInput Component
 * Text input with @mention autocomplete for team chat
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  TextInput,
  TouchableOpacity,
  StyleSheet,
  View,
  FlatList,
  Image,
  Keyboard,
} from 'react-native';
import { XStack, YStack, Text, useTheme } from '@/shared/components/tamagui';
import { PaperPlaneRight, At } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import type { TeamMemberForMention } from '../types';

interface MentionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (mentions: string[]) => void;
  placeholder?: string;
  members: TeamMemberForMention[];
  isLoadingMembers?: boolean;
  isSending?: boolean;
  maxLength?: number;
}

export function MentionInput({
  value,
  onChangeText,
  onSend,
  placeholder = 'Type a message...',
  members,
  isLoadingMembers,
  isSending,
  maxLength = 2000,
}: MentionInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const primaryColor = theme.primary?.val || '#3A5BA0';
  const mutedColor = theme.colorMuted.val;

  // Filter members based on mention query
  const filteredMembers = mentionQuery
    ? members.filter(
        (member) =>
          member.username?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          member.display_name?.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : members;

  // Detect @mentions as user types
  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);

      // Find the last @ symbol before cursor
      const textBeforeCursor = text.slice(0, cursorPosition + (text.length - value.length));
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex >= 0) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Check if we're still in a mention (no spaces after @)
        if (!textAfterAt.includes(' ')) {
          setMentionQuery(textAfterAt);
          setShowMentions(true);
          return;
        }
      }

      setShowMentions(false);
      setMentionQuery('');
    },
    [value, cursorPosition, onChangeText]
  );

  const handleSelectionChange = useCallback(
    (event: { nativeEvent: { selection: { start: number; end: number } } }) => {
      setCursorPosition(event.nativeEvent.selection.start);
    },
    []
  );

  const handleSelectMention = useCallback(
    (member: TeamMemberForMention) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Find the @ to replace
      const textBeforeCursor = value.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex >= 0) {
        // Replace @query with @username
        const username = member.username || member.identity_id.slice(0, 8);
        const newText =
          value.slice(0, lastAtIndex) + `@${username} ` + value.slice(cursorPosition);
        onChangeText(newText);

        // Track the mention
        if (!selectedMentions.includes(member.identity_id)) {
          setSelectedMentions([...selectedMentions, member.identity_id]);
        }
      }

      setShowMentions(false);
      setMentionQuery('');
    },
    [value, cursorPosition, selectedMentions, onChangeText]
  );

  const handleSend = useCallback(() => {
    if (!value.trim() || isSending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend(selectedMentions);
    setSelectedMentions([]);
    Keyboard.dismiss();
  }, [value, isSending, selectedMentions, onSend]);

  const canSend = value.trim().length > 0 && !isSending;

  return (
    <YStack>
      {/* Mention suggestions */}
      {showMentions && filteredMembers.length > 0 && (
        <View
          style={[
            styles.mentionList,
            {
              backgroundColor: theme.cardBackground.val,
              borderColor: theme.cardBorder.val,
            },
          ]}
        >
          <FlatList
            data={filteredMembers.slice(0, 5)}
            keyExtractor={(item) => item.identity_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectMention(item)}
                style={styles.mentionItem}
                activeOpacity={0.7}
              >
                <XStack alignItems="center" gap="$2" padding="$2">
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      style={[
                        styles.mentionAvatar,
                        { backgroundColor: theme.backgroundHover.val },
                      ]}
                    />
                  ) : (
                    <View
                      style={[styles.mentionAvatar, { backgroundColor: primaryColor }]}
                    >
                      <Text color="white" fontSize={10} fontWeight="600">
                        {(item.display_name || item.username || '?')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="500" color="$color">
                      {item.display_name || item.username || 'User'}
                    </Text>
                    {item.username && item.display_name && (
                      <Text fontSize="$2" color="$colorMuted">
                        @{item.username}
                      </Text>
                    )}
                  </YStack>
                </XStack>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Input area */}
      <XStack
        backgroundColor="$cardBackground"
        borderTopWidth={1}
        borderColor="$cardBorder"
        padding="$2"
        gap="$2"
        alignItems="flex-end"
      >
        {/* @ button for starting mentions */}
        <TouchableOpacity
          onPress={() => {
            onChangeText(value + '@');
            setShowMentions(true);
            inputRef.current?.focus();
          }}
          style={styles.mentionButton}
          activeOpacity={0.7}
        >
          <At size={24} color={mutedColor} />
        </TouchableOpacity>

        {/* Text input */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.backgroundHover.val,
              borderColor: theme.cardBorder.val,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={handleTextChange}
            onSelectionChange={handleSelectionChange}
            placeholder={placeholder}
            placeholderTextColor={mutedColor}
            style={[styles.input, { color: theme.color.val }]}
            multiline
            maxLength={maxLength}
            editable={!isSending}
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? primaryColor : theme.backgroundHover.val,
            },
          ]}
          activeOpacity={0.7}
        >
          <PaperPlaneRight
            size={20}
            color={canSend ? 'white' : mutedColor}
            weight="fill"
          />
        </TouchableOpacity>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  mentionList: {
    maxHeight: 200,
    borderTopWidth: 1,
    borderBottomWidth: 0,
  },
  mentionItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionButton: {
    padding: 8,
    marginBottom: 4,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 84,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
