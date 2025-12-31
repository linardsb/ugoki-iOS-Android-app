import { YStack, XStack, Text, Button, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, WarningCircle, ForkKnife } from 'phosphor-react-native';

const BREAK_FAST_GUIDE = {
  bestFoods: [
    { name: 'Eggs', desc: 'High in protein, vitamins & easy to digest' },
    { name: 'Bone broth or soup', desc: 'Gentle on stomach, hydrating' },
    { name: 'Avocado', desc: "Healthy fats, won't spike blood sugar" },
    { name: 'Greek yogurt', desc: 'Probiotics help digestion' },
    { name: 'Cooked vegetables', desc: 'Soft fiber, nutrient-rich' },
  ],
  tips: [
    'Start with a small portion',
    'Eat slowly and mindfully',
    'Drink water first',
    'Wait 15-30 min before eating more',
  ],
  avoid: [
    'Sugary foods & drinks',
    'Processed carbs (bread, pasta)',
    'Raw vegetables initially',
    'Alcohol on empty stomach',
  ],
};

export default function BreakFastGuideScreen() {
  const router = useRouter();

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
          <XStack gap="$2" alignItems="center">
            <ForkKnife size={24} color="$primary" weight="thin" />
            <YStack>
              <Text fontSize="$5" fontWeight="bold" color="$color">
                Break Your Fast Safely
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                What to eat after fasting
              </Text>
            </YStack>
          </XStack>
          <Button
            size="$3"
            circular
            backgroundColor="$cardBackground"
            onPress={() => router.back()}
          >
            <X size={20} color="$color" weight="thin" />
          </Button>
        </XStack>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Best Foods */}
          <YStack gap="$3" marginBottom="$5">
            <XStack gap="$2" alignItems="center">
              <Check size={20} color="#22c55e" weight="thin" />
              <Text fontSize="$5" fontWeight="600" color="$color">
                Best Foods to Start With
              </Text>
            </XStack>
            <YStack gap="$3" paddingLeft="$1">
              {BREAK_FAST_GUIDE.bestFoods.map((food, i) => (
                <XStack
                  key={i}
                  backgroundColor="$cardBackground"
                  padding="$3"
                  borderRadius="$3"
                  gap="$3"
                  alignItems="center"
                >
                  <XStack
                    width={40}
                    height={40}
                    borderRadius={20}
                    backgroundColor="#22c55e20"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text fontSize="$4">
                      {['🥚', '🍲', '🥑', '🥛', '🥦'][i]}
                    </Text>
                  </XStack>
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="500" color="$color">
                      {food.name}
                    </Text>
                    <Text fontSize="$3" color="$colorMuted">
                      {food.desc}
                    </Text>
                  </YStack>
                </XStack>
              ))}
            </YStack>
          </YStack>

          {/* Tips */}
          <YStack gap="$3" marginBottom="$5">
            <XStack gap="$2" alignItems="center">
              <WarningCircle size={20} color="#f59e0b" weight="thin" />
              <Text fontSize="$5" fontWeight="600" color="$color">
                Tips for Breaking Fast
              </Text>
            </XStack>
            <YStack
              backgroundColor="$cardBackground"
              padding="$4"
              borderRadius="$3"
              gap="$2"
            >
              {BREAK_FAST_GUIDE.tips.map((tip, i) => (
                <XStack key={i} gap="$2" alignItems="center">
                  <Text color="#f59e0b" fontSize="$4">•</Text>
                  <Text fontSize="$3" color="$color">
                    {tip}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </YStack>

          {/* Avoid */}
          <YStack gap="$3" marginBottom="$6">
            <XStack gap="$2" alignItems="center">
              <X size={20} color="#ef4444" weight="thin" />
              <Text fontSize="$5" fontWeight="600" color="$color">
                Foods to Avoid
              </Text>
            </XStack>
            <YStack
              backgroundColor="$cardBackground"
              padding="$4"
              borderRadius="$3"
              gap="$2"
            >
              {BREAK_FAST_GUIDE.avoid.map((item, i) => (
                <XStack key={i} gap="$2" alignItems="center">
                  <Text color="#ef4444" fontSize="$4">✗</Text>
                  <Text fontSize="$3" color="$color">
                    {item}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </YStack>

          {/* Bottom padding */}
          <YStack height={40} />
        </ScrollView>

        {/* Action Button */}
        <YStack padding="$4" paddingBottom="$6" borderTopWidth={1} borderTopColor="$borderColor">
          <Button
            size="$6"
            height={56}
            backgroundColor="$primary"
            borderRadius="$4"
            pressStyle={{ scale: 0.98 }}
            onPress={() => {
              router.back();
              router.push('/(tabs)/fasting');
            }}
          >
            <Text color="white" fontWeight="700" fontSize="$5">
              Go to Fasting
            </Text>
          </Button>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
