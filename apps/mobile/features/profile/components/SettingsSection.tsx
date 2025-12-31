import { YStack, Text } from 'tamagui';

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <YStack gap="$1">
      {title && (
        <Text
          fontSize="$3"
          fontWeight="600"
          color="$colorMuted"
          textTransform="uppercase"
          paddingHorizontal="$4"
          paddingBottom="$1"
        >
          {title}
        </Text>
      )}
      <YStack borderRadius="$3" overflow="hidden">
        {children}
      </YStack>
    </YStack>
  );
}
