import { useRef, useEffect, useCallback } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { useTheme } from '@tamagui/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gear, Trash } from 'phosphor-react-native';
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
      Alert.alert('Error', error);
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
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearMessages(),
        },
      ]
    );
  };

  const currentPersonality = PERSONALITIES.find((p) => p.id === personality);

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
              <XStack gap="$3" alignItems="center">
                <YStack>
                  <Text fontSize="$5" fontWeight="bold" color="$color">
                    AI Coach
                  </Text>
                  <XStack gap="$1" alignItems="center">
                    <Text fontSize="$2" color="$colorMuted">
                      {currentPersonality?.emoji} {currentPersonality?.name}
                    </Text>
                  </XStack>
                </YStack>
                {messages.length > 0 && (
                  <Button
                    size="$3"
                    circular
                    backgroundColor="$cardBackground"
                    onPress={handleClearChat}
                  >
                    <Trash size={18} color="$colorMuted" weight="thin" />
                  </Button>
                )}
              </XStack>

              <XStack gap="$3" alignItems="center">
                <Button
                  size="$4"
                  width={44}
                  height={44}
                  circular
                  backgroundColor="$cardBackground"
                  onPress={() => router.push('/(modals)/settings')}
                >
                  <Gear size={24} color="$color" weight="thin" />
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
});
