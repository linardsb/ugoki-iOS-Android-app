import { useRef, useEffect, useCallback } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { useTheme } from '@tamagui/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gear, Sparkle, Mountains, Anchor, SmileyWink } from 'phosphor-react-native';
import {
  useSendMessage,
  useChatStore,
  ChatBubble,
  ChatInput,
  TypingIndicator,
  QuickActions,
  WelcomeMessage,
  PERSONALITIES,
} from '@/features/coach';
import type { QuickAction } from '@/features/coach';
import { useProfile } from '@/features/profile';
import { ThemeToggle } from '@/shared/components/ui';

export default function CoachScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollViewRef = useRef<any>(null);
  const iconColor = theme.color.val;

  // Get user profile for gender-based coach avatar
  const { data: profile } = useProfile();
  const userGender = profile?.gender;

  const {
    messages,
    personality,
    quickActions,
    isTyping,
    addUserMessage,
    addAssistantMessage,
    setQuickActions,
    setTyping,
    clearMessages,
  } = useChatStore();

  const sendMessage = useSendMessage({
    onSuccess: (response) => {
      addAssistantMessage(response.response.message);
      setQuickActions(response.quick_actions);
    },
    onError: (error) => {
      setTyping(false);
      // Add error message to chat so user sees feedback
      addAssistantMessage("Sorry, I couldn't process that request. Please try again.");
      Alert.alert('Connection Error', 'Failed to send message. Please check your connection and try again.');
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isTyping]);

  const handleSend = useCallback((message: string) => {
    addUserMessage(message);
    setTyping(true);
    setQuickActions([]);
    sendMessage.mutate({ message, personality });
  }, [personality, addUserMessage, setTyping, setQuickActions, sendMessage]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    // For now, just send the label as a message
    handleSend(action.label);
  }, [handleSend]);

  const handleClearChat = () => {
    Alert.alert(
      'End Chat',
      'Are you sure you want to end this chat and clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Chat',
          style: 'destructive',
          onPress: () => clearMessages(),
        },
      ]
    );
  };

  const currentPersonality = PERSONALITIES.find((p) => p.id === personality);

  const PERSONALITY_ICONS = {
    Sparkle,
    Mountains,
    Anchor,
    SmileyWink,
  } as const;

  const PersonalityIcon = currentPersonality ? PERSONALITY_ICONS[currentPersonality.iconName] : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inner}>
          {/* Header */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$3"
            paddingTop={insets.top + 12}
            justifyContent="space-between"
            alignItems="center"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
            backgroundColor="$background"
          >
              {/* Left: AI Coach title */}
              <YStack flex={1}>
                <Text fontSize="$5" fontWeight="bold" color="$color">
                  AI Coach
                </Text>
                <XStack gap="$1.5" alignItems="center">
                  {PersonalityIcon && <PersonalityIcon size={14} color="#6b7280" weight="fill" />}
                  <Text fontSize="$3" color="$colorMuted">
                    {currentPersonality?.name}
                  </Text>
                </XStack>
              </YStack>

              {/* Center: End Chat button */}
              <View style={styles.centerSection}>
                {messages.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearChat}
                    style={styles.endChatButton}
                    activeOpacity={0.7}
                  >
                    <RNText style={styles.endChatText}>End Chat</RNText>
                  </TouchableOpacity>
                )}
              </View>

              {/* Right: Settings and Theme */}
              <XStack gap="$3" alignItems="center" flex={1} justifyContent="flex-end">
                <Button
                  size="$4"
                  width={44}
                  height={44}
                  circular
                  backgroundColor="$cardBackground"
                  onPress={() => router.push('/(modals)/settings')}
                >
                  <Gear size={24} color={iconColor} weight="regular" />
                </Button>
                <ThemeToggle size={44} />
              </XStack>
            </XStack>

            {/* Messages */}
            {messages.length === 0 && !isTyping ? (
              <WelcomeMessage onSuggestionPress={handleSend} userGender={userGender} />
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={{ paddingVertical: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={true}
                bounces={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                scrollEventThrottle={16}
              >
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} userGender={userGender} />
                ))}
                {isTyping && <TypingIndicator />}
              </ScrollView>
            )}

            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <YStack paddingVertical="$2">
                <QuickActions actions={quickActions} onSelect={handleQuickAction} />
              </YStack>
            )}

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            disabled={sendMessage.isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endChatButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  endChatText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
});
