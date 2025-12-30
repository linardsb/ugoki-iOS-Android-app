import { YStack, Text, Button } from 'tamagui';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$4"
    >
      {icon && (
        <YStack
          width={80}
          height={80}
          borderRadius="$full"
          backgroundColor="$backgroundHover"
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </YStack>
      )}

      <YStack alignItems="center" gap="$2" maxWidth={280}>
        <Text
          color="$color"
          fontSize="$6"
          fontWeight="600"
          textAlign="center"
        >
          {title}
        </Text>

        {description && (
          <Text
            color="$colorMuted"
            fontSize="$4"
            textAlign="center"
            lineHeight={22}
          >
            {description}
          </Text>
        )}
      </YStack>

      {actionLabel && onAction && (
        <Button
          size="$4"
          backgroundColor="$primary"
          pressStyle={{ backgroundColor: '$primaryPress' }}
          onPress={onAction}
          marginTop="$2"
        >
          <Text color="white" fontWeight="600">
            {actionLabel}
          </Text>
        </Button>
      )}
    </YStack>
  );
}
