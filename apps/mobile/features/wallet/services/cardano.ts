/**
 * Cardano Blockchain Service
 *
 * Direct Blockfrost API integration for React Native.
 * No native dependencies - uses fetch API.
 * Supports preprod testnet for development and mainnet for production.
 */

import type { CardanoNetwork, TokenBalance } from '../types';
import { UGOKI_TOKEN_POLICY, CURRENT_NETWORK } from '../types';

// Blockfrost API configuration
const BLOCKFROST_BASE_URLS: Record<CardanoNetwork, string> = {
  mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
  preview: 'https://cardano-preview.blockfrost.io/api/v0',
};

// Blockfrost API keys (should be moved to env vars for production)
// Get a free API key at https://blockfrost.io/
const BLOCKFROST_KEYS: Record<CardanoNetwork, string> = {
  mainnet: '', // Add mainnet key when ready
  preprod: 'preprodRi4HgdejrokotxWFBKtTLPc560ODoEnK',
  preview: '',
};

// Lovelace to ADA conversion (1 ADA = 1,000,000 lovelace)
const LOVELACE_PER_ADA = 1_000_000;

// Asset response from Blockfrost
interface BlockfrostAsset {
  unit: string;
  quantity: string;
}

/**
 * Make authenticated request to Blockfrost API
 */
async function blockfrostFetch<T>(
  endpoint: string,
  network: CardanoNetwork = CURRENT_NETWORK
): Promise<T | null> {
  const apiKey = BLOCKFROST_KEYS[network];
  const baseUrl = BLOCKFROST_BASE_URLS[network];

  if (!apiKey) {
    console.warn(`[Cardano] No Blockfrost API key configured for ${network}`);
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        project_id: apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Address not found (no transactions yet)
        return null;
      }
      throw new Error(`Blockfrost API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    console.error('[Cardano] Blockfrost request failed:', error);
    return null;
  }
}

/**
 * Fetch wallet balance including ADA and $UGOKI tokens
 */
export async function fetchWalletBalance(
  address: string,
  network: CardanoNetwork = CURRENT_NETWORK
): Promise<TokenBalance | null> {
  // Check if Blockfrost is configured
  if (!BLOCKFROST_KEYS[network]) {
    console.log('[Cardano] Using mock balance (no API key configured)');
    return {
      ugoki: '0',
      ada: '0',
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    // Fetch address info (includes ADA balance)
    const addressInfo = await blockfrostFetch<{ amount: BlockfrostAsset[] }>(
      `/addresses/${address}`,
      network
    );

    if (!addressInfo) {
      // New address with no transactions
      return {
        ugoki: '0',
        ada: '0',
        updatedAt: new Date().toISOString(),
      };
    }

    const assets = addressInfo.amount || [];

    // Find ADA balance (lovelace)
    const lovelaceAsset = assets.find((a) => a.unit === 'lovelace');
    const lovelaceBalance = lovelaceAsset?.quantity || '0';
    const adaBalance = (BigInt(lovelaceBalance) / BigInt(LOVELACE_PER_ADA)).toString();

    // Find $UGOKI token balance
    const policyId = UGOKI_TOKEN_POLICY[network];
    let ugokiBalance = '0';

    if (policyId) {
      const ugokiAsset = assets.find((a) => a.unit.startsWith(policyId));
      ugokiBalance = ugokiAsset?.quantity || '0';
    }

    return {
      ugoki: ugokiBalance,
      ada: adaBalance,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Cardano] Failed to fetch balance:', error);
    return null;
  }
}

/**
 * Validate Cardano address format
 */
export function isValidCardanoAddress(
  address: string,
  network: CardanoNetwork = CURRENT_NETWORK
): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Basic format validation
  if (network === 'mainnet') {
    // Mainnet addresses start with 'addr1'
    return address.startsWith('addr1') && address.length >= 58;
  } else {
    // Testnet addresses start with 'addr_test1'
    return address.startsWith('addr_test1') && address.length >= 58;
  }
}

/**
 * Get address prefix for network
 */
export function getAddressPrefix(network: CardanoNetwork = CURRENT_NETWORK): string {
  return network === 'mainnet' ? 'addr1' : 'addr_test1';
}

/**
 * Format ADA amount with proper decimals
 */
export function formatAda(lovelace: string | bigint): string {
  const value = typeof lovelace === 'string' ? BigInt(lovelace) : lovelace;
  const ada = Number(value) / LOVELACE_PER_ADA;
  return ada.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/**
 * Format token amount (no decimals for native tokens)
 */
export function formatTokenAmount(amount: string | bigint): string {
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  return value.toLocaleString();
}

/**
 * Check if Blockfrost is configured for the network
 */
export function isBlockfrostConfigured(network: CardanoNetwork = CURRENT_NETWORK): boolean {
  return !!BLOCKFROST_KEYS[network];
}

/**
 * Get Cardano explorer URL for transaction
 */
export function getTxExplorerUrl(
  txHash: string,
  network: CardanoNetwork = CURRENT_NETWORK
): string {
  const baseUrls: Record<CardanoNetwork, string> = {
    mainnet: 'https://cardanoscan.io/transaction',
    preprod: 'https://preprod.cardanoscan.io/transaction',
    preview: 'https://preview.cardanoscan.io/transaction',
  };

  return `${baseUrls[network]}/${txHash}`;
}

/**
 * Get Cardano explorer URL for address
 */
export function getAddressExplorerUrl(
  address: string,
  network: CardanoNetwork = CURRENT_NETWORK
): string {
  const baseUrls: Record<CardanoNetwork, string> = {
    mainnet: 'https://cardanoscan.io/address',
    preprod: 'https://preprod.cardanoscan.io/address',
    preview: 'https://preview.cardanoscan.io/address',
  };

  return `${baseUrls[network]}/${address}`;
}
