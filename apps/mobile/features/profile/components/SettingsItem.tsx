import { XStack, Text, useTheme } from '@/shared/components/tamagui';
import { CaretRight } from 'phosphor-react-native';
import { AppSwitch } from '@/shared/components/ui';

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  // For toggle items
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  // Styling
  destructive?: boolean;
}

export function SettingsItem({
  icon,
  label,
  value,
  onPress,
  isToggle = false,
  toggleValue = false,
  onToggle,
  destructive = false,
}: SettingsItemProps) {
  const theme = useTheme();
  const mutedIconColor = theme.colorMuted.val;
  return (
    <XStack
      backgroundColor="$cardBackground"
      paddingHorizontal="$4"
      paddingVertical="$3"
      alignItems="center"
      gap="$3"
      pressStyle={onPress ? { opacity: 0.8 } : undefined}
      onPress={onPress}
    >
      {/* Icon */}
      <XStack
        width={36}
        height={36}
        borderRadius="$3"
        backgroundColor={destructive ? '#ef444420' : '$backgroundHover'}
        justifyContent="center"
        alignItems="center"
      >
        {icon}
      </XStack>

      {/* Label */}
      <Text
        flex={1}
        fontSize="$4"
        color={destructive ? '#ef4444' : '$color'}
      >
        {label}
      </Text>

      {/* Value or toggle */}
      {isToggle ? (
        <AppSwitch
          checked={toggleValue}
          onCheckedChange={onToggle}
        />
      ) : value ? (
        <Text fontSize="$3" color="$colorMuted">
          {value}
        </Text>
      ) : null}

      {/* Chevron for navigation items */}
      {onPress && !isToggle && (
        <CaretRight size={20} color={mutedIconColor} weight="regular" />
      )}
    </XStack>
  );
}
