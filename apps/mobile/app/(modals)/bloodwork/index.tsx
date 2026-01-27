/**
 * Bloodwork Hub - Upload and view blood test history.
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text, Button, useTheme } from 'tamagui';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ScreenHeader } from '@/shared/components/ui';
import {
  Upload,
  Image,
  Camera,
  File,
  ClockCounterClockwise,
  CaretRight,
  CheckCircle,
  Warning,
  Drop,
} from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import {
  useUploadBloodwork,
  useSupportedFormats,
  useBloodworkHistory,
  BloodworkResults,
} from '@/features/bloodwork';
import type { BloodworkUploadResponse, BiomarkerTestGroup } from '@/features/bloodwork';

type TabType = 'upload' | 'history';
type UploadState = 'idle' | 'selected' | 'uploading' | 'success';

export default function BloodworkHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  // Theme-aware colors from design tokens
  const backgroundColor = theme.background.val;
  const cardBackground = theme.cardBackground.val;
  const cardBorder = theme.cardBorder.val;
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const borderColor = theme.borderColor.val;
  const primaryColor = theme.primary.val;
  const successColor = theme.success.val;
  const successSubtle = theme.successSubtle.val;
  const warningColor = theme.warning.val;
  const infoColor = theme.info.val;

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const [results, setResults] = useState<BloodworkUploadResponse | null>(null);

  // Queries
  const { data: formats } = useSupportedFormats();
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useBloodworkHistory();

  const uploadBloodwork = useUploadBloodwork({
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResults(data);
      setUploadState('success');
      refetchHistory();
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Upload Failed', error);
      setUploadState('selected');
    },
  });

  const handlePickImage = async (useCamera: boolean) => {
    try {
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
    uploadBloodwork.mutate({ file: selectedFile });
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResults(null);
    setUploadState('idle');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderUploadTab = () => {
    if (uploadState === 'success' && results) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Success header */}
          <YStack
            backgroundColor="$cardBackground"
            padding="$4"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$cardBorder"
            alignItems="center"
            gap="$2"
            marginBottom="$4"
          >
            <View style={[styles.successIcon, { backgroundColor: successSubtle }]}>
              <CheckCircle size={36} color={successColor} weight="thin" />
            </View>
            <Text fontSize={18} fontWeight="bold" style={{ color: textColor }}>
              Analysis Complete
            </Text>
            <Text fontSize={14} style={{ color: mutedColor }} textAlign="center">
              {results.message}
            </Text>
          </YStack>

          {/* Results */}
          <BloodworkResults
            biomarkers={results.biomarkers}
            testDate={results.test_date}
          />

          {/* Action buttons */}
          <YStack gap="$3" marginTop="$4">
            <Button
              size="$5"
              height={48}
              backgroundColor="$primary"
              borderRadius="$4"
              pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
              onPress={() => setActiveTab('history')}
            >
              <XStack gap="$2" alignItems="center">
                <ClockCounterClockwise size={20} color="white" weight="thin" />
                <Text color="white" fontWeight="600">
                  View History
                </Text>
              </XStack>
            </Button>
            <Button
              size="$5"
              height={48}
              backgroundColor="$cardBackground"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$cardBorder"
              pressStyle={{ scale: 0.98 }}
              onPress={handleReset}
            >
              <Text color="$color" fontWeight="600">
                Upload Another
              </Text>
            </Button>
          </YStack>
        </ScrollView>
      );
    }

    if (uploadState === 'selected' || uploadState === 'uploading') {
      const isPDF = selectedFile?.type === 'application/pdf';
      return (
        <YStack flex={1} padding="$4" gap="$4">
          <YStack
            backgroundColor="$cardBackground"
            padding="$4"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$cardBorder"
            alignItems="center"
            gap="$3"
          >
            <View style={[styles.fileIcon, { backgroundColor: theme.backgroundHover.val }]}>
              {isPDF ? (
                <File size={40} color={infoColor} weight="thin" />
              ) : (
                <Image size={40} color={successColor} weight="thin" />
              )}
            </View>
            <YStack alignItems="center" gap="$1">
              <Text fontSize={16} fontWeight="600" style={{ color: textColor }} textAlign="center">
                {selectedFile?.name}
              </Text>
              <Text fontSize={14} style={{ color: mutedColor }}>
                {isPDF ? 'PDF Document' : 'Image'}
              </Text>
            </YStack>
          </YStack>

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
                  <Text color="white" fontWeight="700" fontSize={16}>
                    Analyzing...
                  </Text>
                </XStack>
              ) : (
                <XStack gap="$2" alignItems="center">
                  <Upload size={20} color="white" weight="thin" />
                  <Text color="white" fontWeight="700" fontSize={16}>
                    Upload & Analyze
                  </Text>
                </XStack>
              )}
            </Button>
            <Button
              size="$5"
              height={48}
              backgroundColor="$cardBackground"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$cardBorder"
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
    }

    // Idle state - show upload options
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <YStack backgroundColor="$cardBackground" padding="$4" borderRadius="$3" borderWidth={1} borderColor="$cardBorder" gap="$3" marginBottom="$4">
          <Text fontSize={18} fontWeight="bold" color="$color">
            Upload Blood Test Results
          </Text>
          <Text fontSize={14} color="$colorMuted" lineHeight={22}>
            Take a photo or select an image of your blood test results. Our AI will
            automatically extract and analyze your biomarkers.
          </Text>
        </YStack>

        {/* Upload options */}
        <YStack gap="$3" marginBottom="$4">
          <Text fontSize={14} fontWeight="600" style={{ color: textColor }}>
            Choose Upload Method
          </Text>

          <UploadOption
            icon={<File size={24} color={infoColor} weight="thin" />}
            iconBg={infoColor}
            title="Upload PDF"
            subtitle="Select a PDF file of your blood test results"
            onPress={handlePickPDF}
            cardBackground={cardBackground}
            cardBorder={cardBorder}
            textColor={textColor}
            mutedColor={mutedColor}
          />

          <UploadOption
            icon={<Image size={24} color={successColor} weight="thin" />}
            iconBg={successColor}
            title="Photo Library"
            subtitle="Select a photo or screenshot of your results"
            onPress={() => handlePickImage(false)}
            cardBackground={cardBackground}
            cardBorder={cardBorder}
            textColor={textColor}
            mutedColor={mutedColor}
          />

          <UploadOption
            icon={<Camera size={24} color={warningColor} weight="thin" />}
            iconBg={warningColor}
            title="Take Photo"
            subtitle="Capture your results with camera"
            onPress={() => handlePickImage(true)}
            cardBackground={cardBackground}
            cardBorder={cardBorder}
            textColor={textColor}
            mutedColor={mutedColor}
          />
        </YStack>

        {/* Tips */}
        <YStack
          backgroundColor="$backgroundHover"
          padding="$3"
          borderRadius="$3"
          gap="$2"
        >
          <Text fontSize={14} fontWeight="600" color="$color">
            Tips for best results
          </Text>
          <TipItem color={successColor} text="PDF files work best for accurate parsing" mutedColor={mutedColor} />
          <TipItem color={successColor} text="For photos, ensure good lighting and focus" mutedColor={mutedColor} />
          <TipItem color={successColor} text="Include the full results page with reference ranges" mutedColor={mutedColor} />
        </YStack>
      </ScrollView>
    );
  };

  const renderHistoryTab = () => {
    if (historyLoading) {
      return (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={primaryColor} />
          <Text fontSize={14} marginTop="$2" color="$colorMuted">
            Loading history...
          </Text>
        </YStack>
      );
    }

    if (!historyData || historyData.length === 0) {
      return (
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Drop size={64} color={mutedColor} weight="thin" />
          <Text fontSize={18} fontWeight="600" marginTop="$3" color="$color">
            No Blood Tests Yet
          </Text>
          <Text fontSize={14} marginTop="$2" color="$colorMuted" textAlign="center">
            Upload your first blood test to start tracking your biomarkers over time.
          </Text>
          <Button
            size="$5"
            height={48}
            backgroundColor="$primary"
            borderRadius="$4"
            marginTop="$4"
            pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
            onPress={() => setActiveTab('upload')}
          >
            <Text color="white" fontWeight="600">
              Upload Blood Test
            </Text>
          </Button>
        </YStack>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetchHistory} />
        }
      >
        <YStack gap="$3">
          {historyData.map((group: BiomarkerTestGroup) => (
            <TouchableOpacity
              key={group.test_date}
              onPress={() => router.push(`/(modals)/bloodwork/${group.test_date.split('T')[0]}`)}
              activeOpacity={0.7}
            >
              <XStack
                backgroundColor="$cardBackground"
                padding="$4"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$cardBorder"
                alignItems="center"
                justifyContent="space-between"
              >
                <YStack flex={1} gap="$1">
                  <Text fontSize={16} fontWeight="600" color="$color">
                    {formatDate(group.test_date)}
                  </Text>
                  <XStack gap="$3" marginTop="$1">
                    <XStack alignItems="center" gap="$1">
                      <CheckCircle size={14} color={successColor} weight="fill" />
                      <Text fontSize={13} color="$colorMuted">
                        {group.normal_count} normal
                      </Text>
                    </XStack>
                    {group.abnormal_count > 0 && (
                      <XStack alignItems="center" gap="$1">
                        <Warning size={14} color={warningColor} weight="fill" />
                        <Text fontSize={13} color="$colorMuted">
                          {group.abnormal_count} flagged
                        </Text>
                      </XStack>
                    )}
                  </XStack>
                  <Text fontSize={13} marginTop="$1" color="$colorMuted">
                    {group.biomarker_count} biomarkers
                  </Text>
                </YStack>
                <CaretRight size={20} color={mutedColor} />
              </XStack>
            </TouchableOpacity>
          ))}
        </YStack>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScreenHeader title="Bloodwork" showClose />

      {/* Tabs */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$2"
        gap="$2"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <TabButton
          label="Upload"
          isActive={activeTab === 'upload'}
          onPress={() => setActiveTab('upload')}
          activeColor={primaryColor}
          inactiveColor={mutedColor}
          backgroundColor={activeTab === 'upload' ? `${primaryColor}15` : 'transparent'}
        />
        <TabButton
          label="History"
          isActive={activeTab === 'history'}
          onPress={() => setActiveTab('history')}
          activeColor={primaryColor}
          inactiveColor={mutedColor}
          backgroundColor={activeTab === 'history' ? `${primaryColor}15` : 'transparent'}
          badge={historyData?.length || 0}
        />
      </XStack>

      {/* Tab content */}
      {activeTab === 'upload' ? renderUploadTab() : renderHistoryTab()}
    </View>
  );
}

// Helper components
function TabButton({
  label,
  isActive,
  onPress,
  activeColor,
  inactiveColor,
  backgroundColor,
  badge,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
  backgroundColor: string;
  badge?: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$2"
        borderRadius="$3"
        backgroundColor={backgroundColor}
        alignItems="center"
        gap="$2"
      >
        <Text
          fontSize={14}
          fontWeight={isActive ? '600' : '500'}
          style={{ color: isActive ? activeColor : inactiveColor }}
        >
          {label}
        </Text>
        {badge !== undefined && badge > 0 && (
          <View
            style={{
              backgroundColor: isActive ? activeColor : inactiveColor,
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 2,
              minWidth: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
              {badge}
            </Text>
          </View>
        )}
      </XStack>
    </TouchableOpacity>
  );
}

function UploadOption({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  cardBackground,
  cardBorder,
  textColor,
  mutedColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  cardBackground: string;
  cardBorder: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <XStack
        backgroundColor={cardBackground}
        padding="$4"
        borderRadius="$3"
        borderWidth={1}
        borderColor={cardBorder}
        alignItems="center"
        gap="$3"
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${iconBg}15` },
          ]}
        >
          {icon}
        </View>
        <YStack flex={1}>
          <Text fontSize={16} fontWeight="600" style={{ color: textColor }}>
            {title}
          </Text>
          <Text fontSize={13} style={{ color: mutedColor }}>
            {subtitle}
          </Text>
        </YStack>
      </XStack>
    </TouchableOpacity>
  );
}

function TipItem({ color, text, mutedColor }: { color: string; text: string; mutedColor: string }) {
  return (
    <XStack gap="$2" alignItems="flex-start">
      <Text style={{ color }}>•</Text>
      <Text fontSize={13} style={{ color: mutedColor }} flex={1}>
        {text}
      </Text>
    </XStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
