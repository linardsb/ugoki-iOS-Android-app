/**
 * Health Sync Card Component
 *
 * Displays health data sync status and allows users to connect/sync their health data
 * from Apple HealthKit (iOS) or Google Health Connect (Android).
 *
 * Uses theme tokens for all colors - no hardcoded values.
 */

import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import { YStack, XStack, Text, Button, Spinner, useTheme } from 'tamagui';
import {
  Heart,
  Lightning,
  Moon,
  Footprints,
  CheckCircle,
  Warning,
  ArrowsClockwise,
} from 'phosphor-react-native';
import { Card } from '@/shared/components/ui';
import { useHealthSync } from '../hooks/useHealthSync';

interface HealthSyncCardProps {
  onSyncComplete?: () => void;
}

export function HealthSyncCard({ onSyncComplete }: HealthSyncCardProps) {
  const theme = useTheme();
  const {
    connectionState,
    syncStatus,
    isLoading,
    requestPermissions,
    syncHealthData,
  } = useHealthSync();

  const [isSyncing, setIsSyncing] = useState(false);

  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
  const isConnected = connectionState.isAuthorized || syncStatus?.is_connected;

  // Theme colors
  const mutedColor = theme.colorMuted.val;
  const successColor = theme.success.val;
  const successBgColor = theme.successMuted?.val || theme.backgroundHover.val;
  const textColor = theme.color.val;

  const handleConnect = async () => {
    try {
      const granted = await requestPermissions();
      if (granted) {
        // Immediately sync after connecting
        await handleSync();
      } else {
        Alert.alert(
          'Permission Required',
          `Please allow UGOKI to access ${platformName} to enable personalized health insights.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to connect to ${platformName}. Please try again.`);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncHealthData(7);
      if (result.synced.length > 0) {
        onSyncComplete?.();
      }
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to sync health data. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!connectionState.isAvailable) {
    return (
      <Card>
        <XStack alignItems="center" gap="$3">
          <XStack
            width={44}
            height={44}
            borderRadius="$3"
            backgroundColor="$backgroundHover"
            justifyContent="center"
            alignItems="center"
          >
            <Warning size={24} color={mutedColor} weight="fill" />
          </XStack>
          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="600" color="$color">
              {platformName} Unavailable
            </Text>
            <Text fontSize="$2" color="$colorMuted">
              {Platform.OS === 'android'
                ? 'Install Health Connect app to enable'
                : 'Health data not available on this device'}
            </Text>
          </YStack>
        </XStack>
      </Card>
    );
  }

  return (
    <Card gap="$4">
      {/* Header */}
      <XStack alignItems="center" gap="$3">
        <XStack
          width={44}
          height={44}
          borderRadius="$3"
          backgroundColor={isConnected ? successBgColor : '$backgroundHover'}
          justifyContent="center"
          alignItems="center"
        >
          {isConnected ? (
            <CheckCircle size={24} color={successColor} weight="fill" />
          ) : (
            <Heart size={24} color={mutedColor} weight="fill" />
          )}
        </XStack>
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="600" color="$color">
            {platformName}
          </Text>
          <Text fontSize="$2" color="$colorMuted">
            {isConnected
              ? `Last sync: ${formatLastSync(syncStatus?.last_sync ?? null)}`
              : 'Connect for personalized insights'}
          </Text>
        </YStack>
      </XStack>

      {/* Connected metrics */}
      {isConnected && syncStatus?.synced_metrics && syncStatus.synced_metrics.length > 0 && (
        <XStack flexWrap="wrap" gap="$2">
          {syncStatus.synced_metrics.includes('health_resting_hr') && (
            <MetricBadge icon={<Heart size={14} color={mutedColor} />} label="Heart Rate" />
          )}
          {syncStatus.synced_metrics.includes('health_hrv') && (
            <MetricBadge icon={<Lightning size={14} color={mutedColor} />} label="HRV" />
          )}
          {syncStatus.synced_metrics.includes('sleep_hours') && (
            <MetricBadge icon={<Moon size={14} color={mutedColor} />} label="Sleep" />
          )}
          {syncStatus.synced_metrics.includes('steps') && (
            <MetricBadge icon={<Footprints size={14} color={mutedColor} />} label="Steps" />
          )}
        </XStack>
      )}

      {/* Action button */}
      {isConnected ? (
        <Button
          size="$4"
          height={48}
          backgroundColor="$backgroundHover"
          borderRadius="$3"
          onPress={handleSync}
          disabled={isSyncing || isLoading}
          icon={
            isSyncing ? (
              <Spinner size="small" color="$color" />
            ) : (
              <ArrowsClockwise size={18} color={textColor} weight="bold" />
            )
          }
        >
          <Text color="$color" fontWeight="600">
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </Button>
      ) : (
        <Button
          size="$4"
          height={48}
          backgroundColor="$primary"
          borderRadius="$3"
          onPress={handleConnect}
          disabled={isLoading}
          icon={
            isLoading ? (
              <Spinner size="small" color="white" />
            ) : (
              <Heart size={18} color="white" weight="fill" />
            )
          }
        >
          <Text color="white" fontWeight="600">
            {isLoading ? 'Connecting...' : `Connect ${platformName}`}
          </Text>
        </Button>
      )}

      {/* Info text */}
      <Text fontSize="$2" color="$colorMuted" textAlign="center">
        Your health data helps personalize fasting and workout recommendations
      </Text>
    </Card>
  );
}

function MetricBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <XStack
      backgroundColor="$backgroundHover"
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$2"
      alignItems="center"
      gap="$1"
    >
      {icon}
      <Text fontSize="$1" color="$colorMuted">
        {label}
      </Text>
    </XStack>
  );
}
