import { YStack, Spinner, Text, styled, GetProps } from '@/shared/components/tamagui';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'large',
  message,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <YStack alignItems="center" gap="$3">
      <Spinner size={size} color="$primary" />
      {message && (
        <Text color="$colorMuted" fontSize="$4">
          {message}
        </Text>
      )}
    </YStack>
  );

  if (fullScreen) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
      >
        {content}
      </YStack>
    );
  }

  return content;
}
