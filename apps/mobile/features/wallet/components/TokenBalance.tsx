import { useEffect } from 'react';
import { YStack, XStack, Text, Button } from '@/shared/components/tamagui';
import { useTheme } from '@tamagui/core';
import { CurrencyCircleDollar, ArrowsClockwise, Gift } from 'phosphor-react-native';
import {
  useWalletStore,
  useIsWalletConnected,
  useWalletBalance,
  useTotalPendingUgoki,
  useUnclaimedRewardsCount,
} from '../stores/walletStore';

interface TokenBalanceProps {
  showPendingRewards?: boolean;
  onClaimPress?: () => void;
}

export function TokenBalance({ showPendingRewards = true, onClaimPress }: TokenBalanceProps) {
  const theme = useTheme();
  const primaryColor = theme.primary.val;
  const mutedColor = theme.colorMuted.val;

  const isConnected = useIsWalletConnected();
  const balance = useWalletBalance();
  const totalPending = useTotalPendingUgoki();
  const unclaimedCount = useUnclaimedRewardsCount();
  const refreshBalance = useWalletStore((s) => s.refreshBalance);

  // Refresh balance on mount if connected
  useEffect(() => {
    if (isConnected) {
      refreshBalance();
    }
  }, [isConnected]);

  if (!isConnected) {
    return null;
  }

  // Format balance with commas
  const formatBalance = (value: string): string => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return '0';
    return num.toLocaleString();
  };

  const ugokiBalance = balance?.ugoki || '0';
  const adaBalance = balance?.ada || '0';

  return (
    <YStack gap="$3">
      {/* Main Balance Card */}
      <YStack
        backgroundColor="$cardBackground"
        padding="$4"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$cardBorder"
      >
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
          <Text fontSize="$3" color="$colorMuted" fontWeight="500">
            Token Balance
          </Text>
          <Button
            size="$2"
            circular
            backgroundColor="transparent"
            pressStyle={{ scale: 0.95 }}
            onPress={refreshBalance}
          >
            <ArrowsClockwise size={16} color={mutedColor} weight="regular" />
          </Button>
        </XStack>

        {/* UGOKI Balance */}
        <XStack alignItems="baseline" gap="$2" marginBottom="$2">
          <Text fontSize="$8" fontWeight="bold" color="$color">
            {formatBalance(ugokiBalance)}
          </Text>
          <Text fontSize="$4" fontWeight="600" color="$primary">
            $UGOKI
          </Text>
        </XStack>

        {/* ADA Balance (for fees) */}
        <XStack alignItems="center" gap="$2">
          <CurrencyCircleDollar size={16} color={mutedColor} weight="fill" />
          <Text fontSize="$3" color="$colorMuted">
            {formatBalance(adaBalance)} ADA available for fees
          </Text>
        </XStack>
      </YStack>

      {/* Pending Rewards Card */}
      {showPendingRewards && unclaimedCount > 0 && (
        <YStack
          backgroundColor="$primary"
          opacity={0.1}
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          borderRadius="$4"
        />
      )}
      {showPendingRewards && unclaimedCount > 0 && (
        <YStack
          backgroundColor="$cardBackground"
          padding="$4"
          borderRadius="$4"
          borderWidth={2}
          borderColor="$primary"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$3">
              <XStack
                width={40}
                height={40}
                borderRadius="$3"
                backgroundColor="$primary"
                opacity={0.15}
                position="absolute"
              />
              <XStack
                width={40}
                height={40}
                borderRadius="$3"
                justifyContent="center"
                alignItems="center"
              >
                <Gift size={20} color={primaryColor} weight="fill" />
              </XStack>
              <YStack>
                <Text fontSize="$4" fontWeight="600" color="$color">
                  {formatBalance(totalPending)} $UGOKI
                </Text>
                <Text fontSize="$3" color="$colorMuted">
                  {unclaimedCount} reward{unclaimedCount > 1 ? 's' : ''} to claim
                </Text>
              </YStack>
            </XStack>

            <Button
              size="$4"
              height={40}
              backgroundColor="$primary"
              borderRadius="$3"
              pressStyle={{ scale: 0.98 }}
              onPress={onClaimPress}
            >
              <Text color="white" fontWeight="600" fontSize="$3">
                Claim
              </Text>
            </Button>
          </XStack>
        </YStack>
      )}

      {/* No pending rewards */}
      {showPendingRewards && unclaimedCount === 0 && (
        <YStack
          backgroundColor="$backgroundHover"
          padding="$3"
          borderRadius="$3"
          alignItems="center"
        >
          <Text fontSize="$3" color="$colorMuted">
            Complete fasts and workouts to earn $UGOKI rewards
          </Text>
        </YStack>
      )}
    </YStack>
  );
}
