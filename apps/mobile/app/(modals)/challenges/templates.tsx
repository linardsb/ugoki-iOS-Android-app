/**
 * Challenge Templates Screen
 * Quick-start challenges from pre-built templates
 */

import React from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, Alert } from 'react-native';
import { YStack, Text, useTheme, Spinner } from '@/shared/components/tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useChallengeTemplates,
  useCreateChallengeFromTemplate,
} from '@/features/social/hooks';
import { ChallengeTemplateCard } from '@/features/social/components';
import type { ChallengeTemplate } from '@/features/social/types';

export default function ChallengeTemplatesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const mutedColor = theme.colorMuted.val;
  const subtleColor = theme.colorSubtle.val;

  const {
    data: templates,
    isLoading,
    refetch,
    isRefetching,
  } = useChallengeTemplates();

  const createFromTemplate = useCreateChallengeFromTemplate();

  const handleLaunchTemplate = (template: ChallengeTemplate) => {
    createFromTemplate.mutate(
      { template_id: template.id },
      {
        onSuccess: (challenge) => {
          Alert.alert(
            'Challenge Created!',
            `"${challenge.name}" has been created. Share the code with friends: ${challenge.join_code}`,
            [
              {
                text: 'View Challenge',
                onPress: () => router.replace(`/(modals)/challenges/${challenge.id}`),
              },
            ]
          );
        },
        onError: (error: any) => {
          Alert.alert(
            'Error',
            error.response?.data?.detail || 'Failed to create challenge'
          );
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScreenHeader title="Quick Start" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <YStack paddingHorizontal="$4" paddingTop="$3" gap="$4">
          {/* Header Section */}
          <YStack gap="$2" marginBottom="$2">
            <Text fontSize="$3" color="$colorMuted">
              Start a challenge instantly with pre-built templates. Invite friends after creating.
            </Text>
          </YStack>

          {/* Templates List */}
          {isLoading ? (
            <YStack alignItems="center" paddingVertical="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : templates && templates.length > 0 ? (
            <YStack gap="$3">
              {templates.map((template) => (
                <ChallengeTemplateCard
                  key={template.id}
                  template={template}
                  onLaunch={handleLaunchTemplate}
                />
              ))}
            </YStack>
          ) : (
            <YStack alignItems="center" paddingVertical="$6" gap="$3">
              <Text fontSize={16} style={{ color: mutedColor }} textAlign="center">
                No templates available
              </Text>
              <Text fontSize={14} style={{ color: subtleColor }} textAlign="center">
                Check back later for new challenge templates
              </Text>
            </YStack>
          )}

          {/* Creating indicator */}
          {createFromTemplate.isPending && (
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.3)"
              alignItems="center"
              justifyContent="center"
              borderRadius="$lg"
            >
              <Spinner size="large" color="white" />
              <Text color="white" marginTop="$3" fontWeight="600">
                Creating challenge...
              </Text>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
