import { Alert, Pressable } from 'react-native';
import { YStack, XStack, Text, Button, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Camera, Image, Trash } from 'phosphor-react-native';
import {
  useUploadAvatar,
  useDeleteAvatar,
  pickImageFromLibrary,
  takePhoto,
  useProfile,
} from '@/features/profile';

export default function AvatarPickerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const iconColor = theme.color.val;
  const { data: profile } = useProfile();

  const uploadAvatar = useUploadAvatar({
    onSuccess: () => {
      router.back();
    },
    onError: (error) => {
      Alert.alert('Upload Failed', error);
    },
  });

  const deleteAvatar = useDeleteAvatar({
    onSuccess: () => {
      router.back();
    },
    onError: (error) => {
      Alert.alert('Delete Failed', error);
    },
  });

  const isLoading = uploadAvatar.isPending || deleteAvatar.isPending;

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) {
      uploadAvatar.mutate(uri);
    }
  };

  const handlePickImage = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) {
      uploadAvatar.mutate(uri);
    }
  };

  const handleDeleteAvatar = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteAvatar.mutate(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          padding="$4"
          justifyContent="space-between"
          alignItems="center"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Text fontSize="$5" fontWeight="bold" color="$color">
            Change Profile Photo
          </Text>
          <Button
            size="$3"
            circular
            backgroundColor="$cardBackground"
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <X size={20} color={iconColor} weight="regular" />
          </Button>
        </XStack>

        {/* Options */}
        <YStack padding="$4" gap="$3">
          <Pressable onPress={handleTakePhoto} disabled={isLoading}>
            <XStack
              backgroundColor="$cardBackground"
              padding="$4"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$cardBorder"
              gap="$3"
              alignItems="center"
              opacity={isLoading ? 0.5 : 1}
            >
              <XStack
                width={48}
                height={48}
                borderRadius={24}
                backgroundColor="$primary"
                justifyContent="center"
                alignItems="center"
              >
                <Camera size={24} color="white" weight="thin" />
              </XStack>
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Take Photo
                </Text>
                <Text fontSize="$3" color="$colorMuted">
                  Use your camera to take a new photo
                </Text>
              </YStack>
            </XStack>
          </Pressable>

          <Pressable onPress={handlePickImage} disabled={isLoading}>
            <XStack
              backgroundColor="$cardBackground"
              padding="$4"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$cardBorder"
              gap="$3"
              alignItems="center"
              opacity={isLoading ? 0.5 : 1}
            >
              <XStack
                width={48}
                height={48}
                borderRadius={24}
                backgroundColor="$secondary"
                justifyContent="center"
                alignItems="center"
              >
                <Image size={24} color="white" weight="thin" />
              </XStack>
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Choose from Library
                </Text>
                <Text fontSize="$3" color="$colorMuted">
                  Select an existing photo from your library
                </Text>
              </YStack>
            </XStack>
          </Pressable>

          {profile?.avatar_url && (
            <Pressable onPress={handleDeleteAvatar} disabled={isLoading}>
              <XStack
                backgroundColor="$cardBackground"
                padding="$4"
                borderRadius="$4"
                gap="$3"
                alignItems="center"
                opacity={isLoading ? 0.5 : 1}
              >
                <XStack
                  width={48}
                  height={48}
                  borderRadius={24}
                  backgroundColor="#ef444420"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Trash size={24} color="#ef4444" weight="thin" />
                </XStack>
                <YStack flex={1}>
                  <Text fontSize="$4" fontWeight="600" color="#ef4444">
                    Remove Photo
                  </Text>
                  <Text fontSize="$3" color="$colorMuted">
                    Delete your current profile photo
                  </Text>
                </YStack>
              </XStack>
            </Pressable>
          )}
        </YStack>

        {/* Loading indicator */}
        {isLoading && (
          <YStack alignItems="center" padding="$4">
            <Text color="$colorMuted">Uploading...</Text>
          </YStack>
        )}
      </YStack>
    </SafeAreaView>
  );
}
