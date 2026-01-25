import { XStack, Circle, useTheme } from 'tamagui';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AppSwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function AppSwitch({ checked, onCheckedChange, disabled }: AppSwitchProps) {
  const theme = useTheme();

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCheckedChange?.(!checked);
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <XStack
        width={50}
        height={28}
        borderRadius="$full"
        backgroundColor={checked ? '$switchTrackOn' : '$switchTrackOff'}
        padding="$0.5"
        alignItems="center"
        justifyContent={checked ? 'flex-end' : 'flex-start'}
        opacity={disabled ? 0.5 : 1}
      >
        <Circle
          size={24}
          backgroundColor="$switchThumb"
          shadowColor="$shadowColor"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={1}
          shadowRadius={2}
          elevation={3}
        />
      </XStack>
    </Pressable>
  );
}

export default AppSwitch;
