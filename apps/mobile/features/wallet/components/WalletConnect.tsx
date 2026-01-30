import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { YStack, XStack, Text, Button, Input } from '@/shared/components/tamagui';
import { useTheme } from '@tamagui/core';
import { Wallet, LinkSimple, Copy, Check, Warning } from 'phosphor-react-native';
import * as Clipboard from 'expo-clipboard';
import { useWalletStore } from '../stores/walletStore';
import { CURRENT_NETWORK } from '../types';
import { isValidCardanoAddress, getAddressPrefix } from '../services/cardano';

// Supported wallet apps for deep linking
const WALLET_APPS = [
  {
    id: 'nami',
    name: 'Nami',
    deepLink: 'nami://',
    storeUrl: 'https://namiwallet.io',
  },
  {
    id: 'eternl',
    name: 'Eternl',
    deepLink: 'eternl://',
    storeUrl: 'https://eternl.io',
  },
  {
    id: 'lace',
    name: 'Lace',
    deepLink: 'lace://',
    storeUrl: 'https://www.lace.io',
  },
] as const;

interface WalletConnectProps {
  onConnected?: () => void;
}

export function WalletConnect({ onConnected }: WalletConnectProps) {
  const theme = useTheme();
  const iconColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const primaryColor = theme.primary.val;

  const {
    isConnected,
    isConnecting,
    wallet,
    connect,
    disconnect,
    setConnecting,
    setConnectionError,
  } = useWalletStore();

  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get expected address prefix for display
  const expectedPrefix = getAddressPrefix(CURRENT_NETWORK);

  // Handle manual address connection
  const handleManualConnect = () => {
    const address = manualAddress.trim();

    if (!address) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    if (!isValidCardanoAddress(address, CURRENT_NETWORK)) {
      Alert.alert(
        'Invalid Address',
        `Please enter a valid Cardano ${CURRENT_NETWORK} address starting with ${expectedPrefix}...`
      );
      return;
    }

    setConnecting(true);

    // Simulate connection delay
    setTimeout(() => {
      connect(address, CURRENT_NETWORK, 'Manual');
      setManualAddress('');
      setShowManualInput(false);
      onConnected?.();
    }, 500);
  };

  // Handle wallet app connection
  const handleWalletAppConnect = async (walletApp: (typeof WALLET_APPS)[number]) => {
    setConnecting(true);

    try {
      // Check if wallet app is installed
      const canOpen = await Linking.canOpenURL(walletApp.deepLink);

      if (canOpen) {
        // Open wallet app for connection
        // Note: Full implementation requires wallet-specific connection protocols
        await Linking.openURL(walletApp.deepLink);

        // For now, show manual input as fallback
        Alert.alert(
          'Connect Wallet',
          `After connecting in ${walletApp.name}, paste your wallet address below.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setConnecting(false) },
            {
              text: 'Enter Address',
              onPress: () => {
                setShowManualInput(true);
                setConnecting(false);
              },
            },
          ]
        );
      } else {
        // Wallet not installed
        Alert.alert(
          `${walletApp.name} Not Found`,
          `Would you like to download ${walletApp.name}?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setConnecting(false) },
            {
              text: 'Download',
              onPress: () => {
                Linking.openURL(walletApp.storeUrl);
                setConnecting(false);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setConnectionError('Failed to connect wallet');
    }
  };

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    if (wallet?.address) {
      await Clipboard.setStringAsync(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet? Your pending rewards will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: disconnect,
        },
      ]
    );
  };

  // Render connected state
  if (isConnected && wallet) {
    const shortAddress = `${wallet.address.slice(0, 12)}...${wallet.address.slice(-8)}`;

    return (
      <YStack gap="$3">
        {/* Connected Badge */}
        <XStack
          backgroundColor="$backgroundHover"
          padding="$3"
          borderRadius="$3"
          alignItems="center"
          gap="$3"
        >
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
            <Wallet size={20} color={primaryColor} weight="fill" />
          </XStack>

          <YStack flex={1}>
            <XStack alignItems="center" gap="$2">
              <Text fontSize="$4" fontWeight="600" color="$color">
                {wallet.walletName || 'Wallet'} Connected
              </Text>
              <XStack
                backgroundColor="#22c55e"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
              >
                <Text fontSize="$2" color="white" fontWeight="600">
                  {CURRENT_NETWORK.toUpperCase()}
                </Text>
              </XStack>
            </XStack>
            <Text fontSize="$3" color="$colorMuted" fontFamily="$mono">
              {shortAddress}
            </Text>
          </YStack>

          <Button
            size="$3"
            circular
            backgroundColor="transparent"
            pressStyle={{ scale: 0.95 }}
            onPress={handleCopyAddress}
          >
            {copied ? (
              <Check size={18} color="#22c55e" weight="bold" />
            ) : (
              <Copy size={18} color={mutedColor} weight="regular" />
            )}
          </Button>
        </XStack>

        {/* Disconnect Button */}
        <Button
          size="$4"
          height={44}
          backgroundColor="$backgroundHover"
          borderRadius="$3"
          pressStyle={{ scale: 0.98 }}
          onPress={handleDisconnect}
        >
          <Text color="$colorMuted">Disconnect Wallet</Text>
        </Button>
      </YStack>
    );
  }

  // Render connection options
  return (
    <YStack gap="$3">
      {/* Testnet Warning */}
      {CURRENT_NETWORK !== 'mainnet' && (
        <XStack
          backgroundColor="#fef3c7"
          padding="$3"
          borderRadius="$3"
          alignItems="center"
          gap="$2"
        >
          <Warning size={18} color="#d97706" weight="fill" />
          <Text fontSize="$3" color="#92400e" flex={1}>
            Connected to {CURRENT_NETWORK} testnet. No real ADA required.
          </Text>
        </XStack>
      )}

      {/* Wallet App Buttons */}
      {!showManualInput && (
        <YStack gap="$2">
          {WALLET_APPS.map((walletApp) => (
            <Button
              key={walletApp.id}
              size="$5"
              height={56}
              backgroundColor="$backgroundHover"
              borderRadius="$3"
              justifyContent="flex-start"
              paddingHorizontal="$4"
              pressStyle={{ scale: 0.98 }}
              disabled={isConnecting}
              opacity={isConnecting ? 0.6 : 1}
              onPress={() => handleWalletAppConnect(walletApp)}
            >
              <XStack alignItems="center" gap="$3" flex={1}>
                <Wallet size={22} color={iconColor} weight="regular" />
                <Text fontSize="$4" fontWeight="500" color="$color">
                  Connect {walletApp.name}
                </Text>
              </XStack>
              <LinkSimple size={18} color={mutedColor} weight="regular" />
            </Button>
          ))}
        </YStack>
      )}

      {/* Manual Address Input */}
      {showManualInput ? (
        <YStack gap="$3">
          <YStack gap="$1">
            <Text fontSize="$3" color="$colorMuted">
              Wallet Address
            </Text>
            <Input
              height={48}
              value={manualAddress}
              onChangeText={setManualAddress}
              placeholder={`${expectedPrefix}...`}
              backgroundColor="$backgroundHover"
              borderWidth={0}
              borderRadius="$3"
              fontSize="$3"
              fontFamily="$mono"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </YStack>

          <XStack gap="$2">
            <Button
              flex={1}
              size="$4"
              height={48}
              backgroundColor="$backgroundHover"
              borderRadius="$3"
              pressStyle={{ scale: 0.98 }}
              onPress={() => {
                setShowManualInput(false);
                setManualAddress('');
              }}
            >
              <Text color="$color">Cancel</Text>
            </Button>
            <Button
              flex={1}
              size="$4"
              height={48}
              backgroundColor="$primary"
              borderRadius="$3"
              pressStyle={{ scale: 0.98 }}
              disabled={isConnecting || !manualAddress.trim()}
              opacity={isConnecting || !manualAddress.trim() ? 0.6 : 1}
              onPress={handleManualConnect}
            >
              <Text color="white" fontWeight="600">
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Text>
            </Button>
          </XStack>
        </YStack>
      ) : (
        <Button
          size="$4"
          height={44}
          backgroundColor="transparent"
          borderRadius="$3"
          pressStyle={{ scale: 0.98 }}
          onPress={() => setShowManualInput(true)}
        >
          <Text color="$colorMuted" fontSize="$3">
            Or enter address manually
          </Text>
        </Button>
      )}
    </YStack>
  );
}
