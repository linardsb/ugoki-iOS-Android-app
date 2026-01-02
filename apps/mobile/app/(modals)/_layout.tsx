import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen
        name="workout/[id]"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="workout-player"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen name="log-weight" />
      <Stack.Screen name="bloodwork" />
      <Stack.Screen
        name="achievements"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen name="break-fast-guide" />
      <Stack.Screen name="avatar-picker" />
      <Stack.Screen
        name="recipes/index"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="recipes/[id]"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="saved-recipes"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="activity"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      {/* Social Screens */}
      <Stack.Screen
        name="social"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="friends"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="friend-requests"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="leaderboards"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="challenges/index"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="challenges/[id]"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="challenges/create"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{
          presentation: 'card',
        }}
      />
      {/* Research Screens */}
      <Stack.Screen
        name="research/index"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="research/[id]"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="research/saved"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
    </Stack>
  );
}
