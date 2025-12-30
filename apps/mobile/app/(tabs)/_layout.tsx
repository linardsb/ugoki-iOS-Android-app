import { Image, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@tamagui/core';
import { House, Timer, Barbell, Chat, User } from 'phosphor-react-native';
import { useProfile } from '@/features/profile';

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { flex: 1 },
        tabBarActiveTintColor: theme.primary?.val || '#f97316',
        tabBarInactiveTintColor: theme.colorHover?.val || '#9ca3af',
        tabBarStyle: {
          backgroundColor: theme.background?.val || '#ffffff',
          borderTopColor: theme.borderColor?.val || '#e5e5e5',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 28,
          height: 85,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <House size={size} color={color} weight="thin" />,
        }}
      />
      <Tabs.Screen
        name="fasting"
        options={{
          title: 'Fast',
          tabBarIcon: ({ color, size }) => <Timer size={size} color={color} weight="thin" />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, size }) => <Barbell size={size} color={color} weight="thin" />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => <Chat size={size} color={color} weight="thin" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <ProfileTabIcon color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
