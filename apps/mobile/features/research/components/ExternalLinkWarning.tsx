/**
 * Warning modal before opening external research links.
 */

import React from 'react';
import { Alert, Linking } from 'react-native';
import { ArrowSquareOut } from 'phosphor-react-native';

interface ExternalLinkWarningOptions {
  url: string;
  title?: string;
}

/**
 * Show confirmation before opening external research link.
 * Returns a promise that resolves when user makes a choice.
 */
export function showExternalLinkWarning({
  url,
  title = 'Research Paper',
}: ExternalLinkWarningOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Open External Link',
      `You're about to leave UGOKI to view "${title}" on an external website.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Open Link',
          onPress: async () => {
            try {
              const canOpen = await Linking.canOpenURL(url);
              if (canOpen) {
                await Linking.openURL(url);
                resolve(true);
              } else {
                Alert.alert('Error', 'Unable to open this link.');
                resolve(false);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to open the link.');
              resolve(false);
            }
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * Open external link with warning.
 */
export async function openResearchLink(url: string, title?: string): Promise<void> {
  await showExternalLinkWarning({ url, title });
}
