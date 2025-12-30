import { XStack, Circle } from 'tamagui';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AppSwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function AppSwitch({ checked, onCheckedChange, disabled }: AppSwitchProps) {
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
        borderRadius={14}
        backgroundColor={checked ? '#22c55e' : '#e4e4e7'}
        padding={2}
        alignItems="center"
        justifyContent={checked ? 'flex-end' : 'flex-start'}
        opacity={disabled ? 0.5 : 1}
      >
        <Circle
          size={24}
          backgroundColor="white"
          shadowColor="rgba(0,0,0,0.2)"
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
