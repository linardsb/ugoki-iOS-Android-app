import { XStack, YStack, H1, Text, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, X } from 'phosphor-react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showClose?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  showClose = false,
  onBack,
  onClose,
  rightAction,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingTop={insets.top + 8}
      paddingBottom="$3"
      paddingHorizontal="$4"
      gap="$3"
    >
      {/* Left side */}
      <XStack alignItems="center" gap="$3" flex={1}>
        {showBack && (
          <Button
            size="$4"
            circular
            backgroundColor="$cardBackground"
            pressStyle={{ backgroundColor: '$backgroundHover' }}
            onPress={handleBack}
          >
            <ArrowLeft size={20} color="$color" weight="thin" />
          </Button>
        )}

        {showClose && (
          <Button
            size="$4"
            circular
            backgroundColor="$cardBackground"
            pressStyle={{ backgroundColor: '$backgroundHover' }}
            onPress={handleClose}
          >
            <X size={20} color="$color" weight="thin" />
          </Button>
        )}

        <YStack flex={1}>
          <H1 color="$color" fontSize="$7" numberOfLines={1}>
            {title}
          </H1>
          {subtitle && (
            <Text color="$colorMuted" fontSize="$3">
              {subtitle}
            </Text>
          )}
        </YStack>
      </XStack>

      {/* Right side */}
      {rightAction && (
        <XStack alignItems="center">{rightAction}</XStack>
      )}
    </XStack>
  );
}
