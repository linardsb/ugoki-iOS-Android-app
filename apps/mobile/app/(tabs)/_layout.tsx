import { Image, View, Dimensions } from 'react-native';
import { withLayoutContext } from 'expo-router';
import { useTheme } from '@tamagui/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { House, Timer, Barbell, Chat, User } from 'phosphor-react-native';
import { useProfile } from '@/features/profile';

const { Navigator } = createMaterialTopTabNavigator();

const MaterialTopTabs = withLayoutContext<
  React.ComponentProps<typeof Navigator>['screenOptions'],
  typeof Navigator
>(Navigator);

function ProfileTabIcon({ color, size }: { color: string; size: number }) {
  const { data: profile } = useProfile();

  if (profile?.avatar_url) {
    return (
      <View
        style={{
          width: size + 4,
          height: size + 4,
          borderRadius: (size + 4) / 2,
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: profile.avatar_url }}
          style={{ width: size + 4, height: size + 4 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return <User size={size} color={color} weight="thin" />;
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { width } = Dimensions.get('window');

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      initialLayout={{ width }}
      pagerStyle={{ flex: 1 }}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: false,
        lazyPreloadDistance: 1,
        tabBarScrollEnabled: false,
        tabBarBounces: false,
        tabBarPressColor: 'transparent',
        tabBarPressOpacity: 0.8,
        tabBarActiveTintColor: theme.primary?.val || '#14b8a6',
        tabBarInactiveTintColor: theme.colorHover?.val || '#9ca3af',
        tabBarStyle: {
          backgroundColor: theme.background?.val || '#ffffff',
          borderTopColor: theme.borderColor?.val || '#e5e5e5',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          height: 70 + (insets.bottom > 0 ? insets.bottom : 12),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          textTransform: 'none',
        },
        tabBarIndicatorStyle: {
          backgroundColor: theme.primary?.val || '#14b8a6',
          height: 3,
          borderRadius: 1.5,
          position: 'absolute',
          top: 0,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarShowIcon: true,
      }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <House size={24} color={color} weight="thin" />,
        }}
      />
      <MaterialTopTabs.Screen
        name="fasting"
        options={{
          title: 'Fast',
          tabBarIcon: ({ color }) => <Timer size={24} color={color} weight="thin" />,
        }}
      />
      <MaterialTopTabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color }) => <Barbell size={24} color={color} weight="thin" />,
        }}
      />
      <MaterialTopTabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color }) => <Chat size={24} color={color} weight="thin" />,
        }}
      />
      <MaterialTopTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <ProfileTabIcon color={color} size={24} />
          ),
        }}
      />
    </MaterialTopTabs>
  );
}
