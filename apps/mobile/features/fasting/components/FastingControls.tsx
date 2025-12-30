import { YStack, XStack, Button, Text, AlertDialog } from 'tamagui';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Play, Pause, Stop, Plus } from 'phosphor-react-native';
import { useFastingStore } from '../stores/fastingStore';
import { useStartFast } from '../hooks/useStartFast';
import { useEndFast } from '../hooks/useEndFast';
import { useExtendFast } from '../hooks/useExtendFast';
import type { FastingProtocol } from '../types';

interface FastingControlsProps {
  onFastStarted?: () => void;
  onFastEnded?: () => void;
}

export function FastingControls({ onFastStarted, onFastEnded }: FastingControlsProps) {
  const { activeWindow, isPaused, pause, resume, reset, getProgress, syncFromServer } = useFastingStore();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showProtocolSelect, setShowProtocolSelect] = useState(false);

  const startFast = useStartFast({
    onSuccess: (window) => {
      syncFromServer(window);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onFastStarted?.();
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Failed to start fast:', error);
    },
  });

  const endFast = useEndFast({
    onSuccess: () => {
      reset();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onFastEnded?.();
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Failed to end fast:', error);
    },
  });

  const extendFast = useExtendFast({
    onSuccess: (window) => {
      syncFromServer(window);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
  });

  const handleStartFast = (protocol: FastingProtocol = '16:8') => {
    setShowProtocolSelect(false);
    startFast.mutate({ protocol });
  };

  const handlePauseResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleEndFast = (abandoned: boolean = false) => {
    setShowEndConfirm(false);
    if (activeWindow) {
      endFast.mutate({ windowId: activeWindow.id, abandoned });
    }
  };

  const handleExtendFast = () => {
    if (activeWindow) {
      extendFast.mutate({ windowId: activeWindow.id, additionalHours: 2 });
    }
  };

  const { isComplete } = getProgress();

  // No active fast - show start button
  if (!activeWindow) {
    return (
      <YStack gap="$4">
        <Button
          size="$6"
          height={56}
          backgroundColor="$primary"
          borderRadius="$4"
          pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
          onPress={() => setShowProtocolSelect(true)}
          disabled={startFast.isPending}
        >
          <XStack gap="$2" alignItems="center">
            <Play size={24} color="white" weight="fill" />
            <Text color="white" fontWeight="700" fontSize="$5">
              {startFast.isPending ? 'Starting...' : 'Start Fast'}
            </Text>
          </XStack>
        </Button>

        {/* Protocol Selection Dialog */}
        <AlertDialog open={showProtocolSelect} onOpenChange={setShowProtocolSelect}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay key="overlay" opacity={0.5} />
            <AlertDialog.Content
              bordered
              elevate
              key="content"
              padding="$5"
              gap="$4"
            >
              <AlertDialog.Title>Choose Fasting Protocol</AlertDialog.Title>
              <AlertDialog.Description>
                Select how long you want to fast
              </AlertDialog.Description>

              <YStack gap="$3">
                <Button
                  size="$6"
                  height={72}
                  backgroundColor="$cardBackground"
                  borderWidth={2}
                  borderColor="$borderColor"
                  borderRadius="$4"
                  pressStyle={{ backgroundColor: '$backgroundHover', scale: 0.98 }}
                  onPress={() => handleStartFast('16:8')}
                >
                  <YStack alignItems="flex-start" width="100%" gap="$1">
                    <Text fontWeight="600" fontSize="$5" color="$color">16:8 Fast</Text>
                    <Text fontSize="$3" color="$colorMuted">16 hours fasting, 8 hours eating</Text>
                  </YStack>
                </Button>

                <Button
                  size="$6"
                  height={72}
                  backgroundColor="$cardBackground"
                  borderWidth={2}
                  borderColor="$borderColor"
                  borderRadius="$4"
                  pressStyle={{ backgroundColor: '$backgroundHover', scale: 0.98 }}
                  onPress={() => handleStartFast('18:6')}
                >
                  <YStack alignItems="flex-start" width="100%" gap="$1">
                    <Text fontWeight="600" fontSize="$5" color="$color">18:6 Fast</Text>
                    <Text fontSize="$3" color="$colorMuted">18 hours fasting, 6 hours eating</Text>
                  </YStack>
                </Button>

                <Button
                  size="$6"
                  height={72}
                  backgroundColor="$cardBackground"
                  borderWidth={2}
                  borderColor="$borderColor"
                  borderRadius="$4"
                  pressStyle={{ backgroundColor: '$backgroundHover', scale: 0.98 }}
                  onPress={() => handleStartFast('20:4')}
                >
                  <YStack alignItems="flex-start" width="100%" gap="$1">
                    <Text fontWeight="600" fontSize="$5" color="$color">20:4 Fast</Text>
                    <Text fontSize="$3" color="$colorMuted">20 hours fasting, 4 hours eating</Text>
                  </YStack>
                </Button>
              </YStack>

              <AlertDialog.Cancel asChild>
                <Button backgroundColor="transparent">
                  <Text color="$colorMuted">Cancel</Text>
                </Button>
              </AlertDialog.Cancel>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog>
      </YStack>
    );
  }

  // Active fast - show controls
  return (
    <YStack gap="$5">
      {/* Main action buttons */}
      <XStack gap="$3" justifyContent="center" flexWrap="wrap">
        {/* End/Complete button - primary action */}
        <Button
          flex={1}
          minWidth={100}
          maxWidth={140}
          height={56}
          backgroundColor={isComplete ? '$primary' : '$cardBackground'}
          borderRadius="$4"
          borderWidth={isComplete ? 0 : 2}
          borderColor="$borderColor"
          pressStyle={{
            backgroundColor: isComplete ? '$primaryPress' : '$backgroundHover',
            scale: 0.97
          }}
          onPress={() => isComplete ? handleEndFast(false) : setShowEndConfirm(true)}
          shadowColor="black"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.1}
          shadowRadius={4}
          elevation={3}
        >
          <YStack alignItems="center" gap="$1">
            <Stop size={22} color={isComplete ? 'white' : '$color'} weight="thin" />
            <Text
              fontSize="$2"
              fontWeight="600"
              color={isComplete ? 'white' : '$color'}
            >
              {isComplete ? 'Complete!' : 'End Fast'}
            </Text>
          </YStack>
        </Button>

        {/* Extend button */}
        {!isComplete && (
          <Button
            flex={1}
            minWidth={100}
            maxWidth={140}
            height={56}
            backgroundColor="$cardBackground"
            borderRadius="$4"
            borderWidth={2}
            borderColor="$secondary"
            pressStyle={{
              backgroundColor: '$backgroundHover',
              scale: 0.97,
              borderColor: '$secondaryPress'
            }}
            onPress={handleExtendFast}
            disabled={extendFast.isPending}
            shadowColor="black"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
          >
            <YStack alignItems="center" gap="$1">
              <Plus size={22} color="$secondary" weight="thin" />
              <Text fontSize="$2" fontWeight="600" color="$secondary">
                {extendFast.isPending ? 'Adding...' : '+2 Hours'}
              </Text>
            </YStack>
          </Button>
        )}

        {/* Pause/Resume button */}
        {!isComplete && (
          <Button
            flex={1}
            minWidth={100}
            maxWidth={140}
            height={56}
            backgroundColor={isPaused ? '$primary' : '$cardBackground'}
            borderRadius="$4"
            borderWidth={isPaused ? 0 : 2}
            borderColor="$borderColor"
            pressStyle={{
              backgroundColor: isPaused ? '$primaryPress' : '$backgroundHover',
              scale: 0.97
            }}
            onPress={handlePauseResume}
            shadowColor="black"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
          >
            <YStack alignItems="center" gap="$1">
              {isPaused ? (
                <>
                  <Play size={22} color="white" weight="fill" />
                  <Text fontSize="$2" fontWeight="600" color="white">
                    Resume
                  </Text>
                </>
              ) : (
                <>
                  <Pause size={22} color="$color" weight="thin" />
                  <Text fontSize="$2" fontWeight="600" color="$color">
                    Pause
                  </Text>
                </>
              )}
            </YStack>
          </Button>
        )}
      </XStack>

      {/* End Confirmation Dialog */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay key="overlay" opacity={0.5} />
          <AlertDialog.Content
            bordered
            elevate
            key="content"
            padding="$5"
            gap="$4"
          >
            <AlertDialog.Title>End Fast Early?</AlertDialog.Title>
            <AlertDialog.Description>
              You haven't reached your goal yet. Do you want to end or abandon this fast?
            </AlertDialog.Description>

            <YStack gap="$3">
              <Button
                size="$6"
                height={56}
                backgroundColor="$primary"
                borderRadius="$4"
                pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
                onPress={() => handleEndFast(false)}
              >
                <Text color="white" fontWeight="700" fontSize="$4">End Fast (Counts as complete)</Text>
              </Button>

              <Button
                size="$6"
                height={56}
                backgroundColor="$error"
                borderRadius="$4"
                pressStyle={{ opacity: 0.9, scale: 0.98 }}
                onPress={() => handleEndFast(true)}
              >
                <Text color="white" fontWeight="700" fontSize="$4">Abandon Fast</Text>
              </Button>

              <AlertDialog.Cancel asChild>
                <Button
                  size="$6"
                  height={48}
                  backgroundColor="transparent"
                  borderRadius="$4"
                >
                  <Text color="$colorMuted" fontWeight="600">Keep Fasting</Text>
                </Button>
              </AlertDialog.Cancel>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </YStack>
  );
}
