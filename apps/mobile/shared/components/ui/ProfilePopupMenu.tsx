/**
 * Profile Popup Menu
 * Floating menu that appears when Profile tab is tapped
 * Provides quick access to Social, Settings, and Profile
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { UsersThree, Gear, User, CookingPot } from 'phosphor-react-native';
import { useUIStore } from '@/shared/stores/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}

function MenuItem({ icon, label, onPress, isLast }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemIcon}>{icon}</View>
      <Text fontSize={16} fontWeight="600" color="$color">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function ProfilePopupMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isProfileMenuOpen, closeProfileMenu } = useUIStore();

  if (!isProfileMenuOpen) return null;

  const handleNavigate = (route: string) => {
    closeProfileMenu();
    // Small delay to allow menu to close smoothly
    setTimeout(() => {
      if (route === '/profile') {
        // Navigate to profile tab
        router.push('/(tabs)/profile');
      } else {
        router.push(route as any);
      }
    }, 100);
  };

  // Position the menu above the tab bar
  // Tab bar height is 85px, we want popup above it
  const bottomPosition = 85 + insets.bottom + 10;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop - tap to close */}
      <Pressable
        style={styles.backdrop}
        onPress={closeProfileMenu}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.backdropInner}
        />
      </Pressable>

      {/* Menu Container */}
      <Animated.View
        entering={FadeIn.duration(200).springify()}
        exiting={FadeOut.duration(150)}
        style={[
          styles.menuContainer,
          {
            bottom: bottomPosition,
            right: 16,
          },
        ]}
      >
        {/* Menu Bubble */}
        <View style={styles.menuBubble}>
          <MenuItem
            icon={<UsersThree size={22} color="#14b8a6" weight="regular" />}
            label="Social"
            onPress={() => handleNavigate('/(modals)/social')}
          />
          <MenuItem
            icon={<CookingPot size={22} color="#f97316" weight="regular" />}
            label="Recipes"
            onPress={() => handleNavigate('/(modals)/recipes')}
          />
          <MenuItem
            icon={<Gear size={22} color="#6b7280" weight="regular" />}
            label="Settings"
            onPress={() => handleNavigate('/(modals)/settings')}
          />
          <MenuItem
            icon={<User size={22} color="#8b5cf6" weight="regular" />}
            label="Profile"
            onPress={() => handleNavigate('/profile')}
            isLast
          />
        </View>

        {/* Arrow pointing down to tab */}
        <View style={styles.arrowContainer}>
          <View style={styles.arrow} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropInner: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
  },
  menuBubble: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemIcon: {
    width: 28,
    alignItems: 'center',
  },
  arrowContainer: {
    alignItems: 'flex-end',
    paddingRight: 24,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
});
