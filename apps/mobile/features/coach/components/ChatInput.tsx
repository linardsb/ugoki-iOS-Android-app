import { useState } from 'react';
import { XStack, Input, Button, useTheme } from 'tamagui';
import { PaperPlaneRight } from 'phosphor-react-native';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Message your coach...',
}: ChatInputProps) {
  const theme = useTheme();
  const mutedColor = theme.colorMuted?.val || '#6B697A';
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
    }
  };

  return (
    <XStack
      paddingHorizontal="$4"
      paddingVertical="$3"
      gap="$2"
      backgroundColor="$background"
      borderTopWidth={1}
      borderTopColor="$borderColor"
    >
      <Input
        flex={1}
        placeholder={placeholder}
        placeholderTextColor="$colorMuted"
        value={message}
        onChangeText={setMessage}
        onSubmitEditing={handleSend}
        returnKeyType="send"
        editable={!disabled}
        backgroundColor="$cardBackground"
        borderWidth={0}
        borderRadius="$4"
        paddingHorizontal="$3"
        paddingVertical="$3"
        fontSize="$3"
      />
      <Button
        size="$4"
        circular
        backgroundColor={message.trim() ? '$primary' : '$cardBackground'}
        onPress={handleSend}
        disabled={disabled || !message.trim()}
      >
        <PaperPlaneRight
          size={20}
          color={message.trim() ? 'white' : mutedColor}
          weight="regular"
        />
      </Button>
    </XStack>
  );
}
