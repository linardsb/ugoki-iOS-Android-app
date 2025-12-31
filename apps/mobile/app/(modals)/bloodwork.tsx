import { useState } from 'react';
import { YStack, XStack, Text, Button } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Upload,
  Image,
  Camera,
  CheckCircle,
  File,
} from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import {
  useUploadBloodwork,
  useSupportedFormats,
  BloodworkResults,
} from '@/features/bloodwork';
import type { BloodworkUploadResponse } from '@/features/bloodwork';

type UploadState = 'idle' | 'selected' | 'uploading' | 'success';

export default function BloodworkScreen() {
  const router = useRouter();

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const [results, setResults] = useState<BloodworkUploadResponse | null>(null);

  const { data: formats } = useSupportedFormats();

  const uploadBloodwork = useUploadBloodwork({
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResults(data);
      setUploadState('success');
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Upload Failed', error);
      setUploadState('selected');
    },
  });

  const handleClose = () => {
    router.back();
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      // Request permission
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          `Please grant ${useCamera ? 'camera' : 'photo library'} access to upload bloodwork images.`
        );
        return;
      }

      // Check if camera is available
      if (useCamera) {
        const cameraAvailable = await ImagePicker.getCameraPermissionsAsync();
        if (!cameraAvailable.granted) {
          Alert.alert(
            'Camera Unavailable',
            'Camera is not available. Please use Photo Library instead.'
          );
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
          });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        // Determine mime type from URI
        const mimeType = asset.uri.toLowerCase().endsWith('.png')
          ? 'image/png'
          : 'image/jpeg';

        setSelectedFile({
          uri: asset.uri,
          type: mimeType,
          name: `bloodwork_${Date.now()}.${mimeType === 'image/png' ? 'png' : 'jpg'}`,
        });
        setUploadState('selected');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error: any) {
      const message = useCamera
        ? 'Camera is not available in this environment. Try using Photo Library instead.'
        : 'Failed to select image. Please try again.';
      Alert.alert('Error', message);
    }
  };

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: 'application/pdf',
          name: asset.name || `bloodwork_${Date.now()}.pdf`,
        });
        setUploadState('selected');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select PDF');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    uploadBloodwork.mutate({
      file: selectedFile,
    });
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResults(null);
    setUploadState('idle');
  };

  const renderIdleState = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 50, gap: 16 }}
      showsVerticalScrollIndicator={true}
      bounces={true}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
    >
      {/* Instructions */}
      <YStack backgroundColor="$cardBackground" padding="$4" borderRadius="$3" gap="$3">
        <Text fontSize="$5" fontWeight="bold" color="$color">
          Upload Blood Test Results
        </Text>
        <Text fontSize="$3" color="$colorMuted" lineHeight={22}>
          Take a photo or select an image of your blood test results. Our AI will
          automatically extract and analyze your biomarkers.
        </Text>
      </YStack>

      {/* Upload options */}
      <YStack gap="$3">
        <Text fontSize="$3" fontWeight="600" color="$color">
          Choose Upload Method
        </Text>

        {/* Upload PDF */}
        <Button
          size="$5"
          height={70}
          backgroundColor="$cardBackground"
          borderRadius="$3"
          justifyContent="flex-start"
          paddingHorizontal="$4"
          pressStyle={{ scale: 0.98, backgroundColor: '$backgroundHover' }}
          onPress={handlePickPDF}
        >
          <XStack flex={1} alignItems="center" gap="$3">
            <XStack
              width={48}
              height={48}
              borderRadius="$3"
              backgroundColor="#3b82f6"
              opacity={0.1}
              position="absolute"
            />
            <XStack
              width={48}
              height={48}
              borderRadius="$3"
              justifyContent="center"
              alignItems="center"
            >
              <File size={24} color="#3b82f6" weight="thin" />
            </XStack>
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="600" color="$color">
                Upload PDF
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                Select a PDF file of your blood test results
              </Text>
            </YStack>
          </XStack>
        </Button>

        {/* Photo from library */}
        <Button
          size="$5"
          height={70}
          backgroundColor="$cardBackground"
          borderRadius="$3"
          justifyContent="flex-start"
          paddingHorizontal="$4"
          pressStyle={{ scale: 0.98, backgroundColor: '$backgroundHover' }}
          onPress={() => handlePickImage(false)}
        >
          <XStack flex={1} alignItems="center" gap="$3">
            <XStack
              width={48}
              height={48}
              borderRadius="$3"
              backgroundColor="#22c55e"
              opacity={0.1}
              position="absolute"
            />
            <XStack
              width={48}
              height={48}
              borderRadius="$3"
              justifyContent="center"
              alignItems="center"
            >
              <Image size={24} color="#22c55e" weight="thin" />
            </XStack>
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="600" color="$color">
                Photo Library
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                Select a photo or screenshot of your results
              </Text>
            </YStack>
          </XStack>
        </Button>

        {/* Take photo */}
        <Button
          size="$5"
          height={70}
          backgroundColor="$cardBackground"
          borderRadius="$3"
          justifyContent="flex-start"
          paddingHorizontal="$4"
          pressStyle={{ scale: 0.98, backgroundColor: '$backgroundHover' }}
          onPress={() => handlePickImage(true)}
        >
          <XStack flex={1} alignItems="center" gap="$3">
            <XStack
              width={48}
              height={48}
              borderRadius="$3"
              backgroundColor="#f59e0b"
              opacity={0.1}
              position="absolute"
            />
            <XStack
              width={48}
              height={48}
              borderRadius="$3"
              justifyContent="center"
              alignItems="center"
            >
              <Camera size={24} color="#f59e0b" weight="thin" />
            </XStack>
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="600" color="$color">
                Take Photo
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                Capture your results with camera
              </Text>
            </YStack>
          </XStack>
        </Button>
      </YStack>

      {/* Tips */}
      <YStack
        backgroundColor="$backgroundHover"
        padding="$3"
        borderRadius="$3"
        gap="$2"
      >
        <Text fontSize="$3" fontWeight="600" color="$color">
          Tips for best results
        </Text>
        <XStack gap="$2" alignItems="flex-start">
          <Text color="$primary">•</Text>
          <Text fontSize="$3" color="$colorMuted" flex={1}>
            PDF files work best for accurate parsing
          </Text>
        </XStack>
        <XStack gap="$2" alignItems="flex-start">
          <Text color="$primary">•</Text>
          <Text fontSize="$3" color="$colorMuted" flex={1}>
            For photos, ensure good lighting and focus
          </Text>
        </XStack>
        <XStack gap="$2" alignItems="flex-start">
          <Text color="$primary">•</Text>
          <Text fontSize="$3" color="$colorMuted" flex={1}>
            Include the full results page with reference ranges
          </Text>
        </XStack>
      </YStack>
    </ScrollView>
  );

  const renderSelectedState = () => {
    const isPDF = selectedFile?.type === 'application/pdf';

    return (
    <YStack flex={1} padding="$4" gap="$4">
      {/* Selected file preview */}
      <YStack
        backgroundColor="$cardBackground"
        padding="$4"
        borderRadius="$3"
        alignItems="center"
        gap="$3"
      >
        <XStack
          width={80}
          height={80}
          borderRadius="$4"
          backgroundColor="$backgroundHover"
          justifyContent="center"
          alignItems="center"
        >
          {isPDF ? (
            <File size={40} color="#3b82f6" weight="thin" />
          ) : (
            <Image size={40} color="#22c55e" weight="thin" />
          )}
        </XStack>

        <YStack alignItems="center" gap="$1">
          <Text fontSize="$4" fontWeight="600" color="$color" textAlign="center">
            {selectedFile?.name}
          </Text>
          <Text fontSize="$3" color="$colorMuted">
            {isPDF ? 'PDF Document' : 'Image'}
          </Text>
        </YStack>
      </YStack>

      {/* Action buttons */}
      <YStack gap="$3" marginTop="auto">
        <Button
          size="$6"
          height={56}
          backgroundColor="$primary"
          borderRadius="$4"
          pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
          onPress={handleUpload}
          disabled={uploadState === 'uploading'}
        >
          {uploadState === 'uploading' ? (
            <XStack gap="$2" alignItems="center">
              <ActivityIndicator color="white" />
              <Text color="white" fontWeight="700" fontSize="$5">
                Analyzing...
              </Text>
            </XStack>
          ) : (
            <XStack gap="$2" alignItems="center">
              <Upload size={20} color="white" weight="thin" />
              <Text color="white" fontWeight="700" fontSize="$5">
                Upload & Analyze
              </Text>
            </XStack>
          )}
        </Button>

        <Button
          size="$5"
          height={48}
          backgroundColor="$backgroundHover"
          borderRadius="$4"
          pressStyle={{ scale: 0.98 }}
          onPress={handleReset}
          disabled={uploadState === 'uploading'}
        >
          <Text color="$color" fontWeight="600">
            Choose Different File
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
  };

  const renderSuccessState = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={true}
      bounces={true}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
    >
      {/* Success header */}
      <YStack
        backgroundColor="$cardBackground"
        padding="$4"
        borderRadius="$3"
        alignItems="center"
        gap="$2"
        marginBottom="$4"
      >
        <XStack
          width={60}
          height={60}
          borderRadius={30}
          backgroundColor="#22c55e"
          opacity={0.15}
          position="absolute"
        />
        <XStack
          width={60}
          height={60}
          borderRadius={30}
          justifyContent="center"
          alignItems="center"
        >
          <CheckCircle size={36} color="#22c55e" weight="thin" />
        </XStack>
        <Text fontSize="$5" fontWeight="bold" color="$color">
          Analysis Complete
        </Text>
        <Text fontSize="$3" color="$colorMuted" textAlign="center">
          {results?.message}
        </Text>
      </YStack>

      {/* Results */}
      {results && (
        <BloodworkResults
          biomarkers={results.biomarkers}
          testDate={results.test_date}
        />
      )}
    </ScrollView>
  );

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
            {uploadState === 'success' ? 'Results' : 'Bloodwork'}
          </Text>
          <XStack gap="$2">
            {uploadState === 'success' && (
              <Button
                size="$3"
                height={36}
                backgroundColor="$backgroundHover"
                borderRadius="$3"
                paddingHorizontal="$3"
                onPress={handleReset}
              >
                <Text color="$color" fontSize="$3">Upload Another</Text>
              </Button>
            )}
            <Button
              size="$3"
              circular
              backgroundColor="$cardBackground"
              onPress={handleClose}
            >
              <X size={20} color="$color" weight="thin" />
            </Button>
          </XStack>
        </XStack>

        {/* Content based on state */}
        {uploadState === 'idle' && renderIdleState()}
        {(uploadState === 'selected' || uploadState === 'uploading') && renderSelectedState()}
        {uploadState === 'success' && renderSuccessState()}
      </YStack>
    </SafeAreaView>
  );
}
