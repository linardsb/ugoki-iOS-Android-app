// Cardano wallet types

export type CardanoNetwork = 'mainnet' | 'preprod' | 'preview';

export interface WalletInfo {
  // Wallet connection
  address: string;
  stakeAddress?: string;
  network: CardanoNetwork;
  connectedAt: string;

  // Wallet metadata
  walletName?: string; // e.g., "Nami", "Eternl", "Lace"
}

export interface TokenBalance {
  // $UGOKI token
  ugoki: string; // String to handle large numbers

  // ADA balance (for transaction fees)
  ada: string;

  // Last updated
  updatedAt: string;
}

export interface PendingReward {
  id: string;
  type: 'fasting' | 'workout' | 'streak' | 'achievement';
  amount: string;
  description: string;
  earnedAt: string;
  claimed: boolean;
}

export interface WalletState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Wallet info
  wallet: WalletInfo | null;

  // Balances
  balance: TokenBalance | null;

  // Pending rewards (not yet claimed)
  pendingRewards: PendingReward[];

  // Transaction history reference
  lastTxHash: string | null;
}

// Cardano transaction types
export interface CardanoTx {
  txHash: string;
  type: 'claim_rewards' | 'transfer' | 'stake';
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

// Streak milestone tracking - to detect when milestones are crossed
export interface StreakMilestoneTracker {
  // Maps streak type to last known count
  // e.g., { fasting: 5, workout: 12 }
  lastKnownCounts: Record<string, number>;

  // Tracks which milestones have been rewarded (to prevent double rewards)
  // e.g., { 'fasting_7': true, 'workout_7': true }
  rewardedMilestones: Record<string, boolean>;
}

// Token policy for $UGOKI (will be set after minting)
export const UGOKI_TOKEN_POLICY: Record<CardanoNetwork, string> = {
  // Preprod testnet policy ID (to be updated after token creation)
  preprod: '',
  // Preview testnet policy ID
  preview: '',
  // Mainnet policy ID (to be updated after mainnet launch)
  mainnet: '',
};

// Current network configuration
export const CURRENT_NETWORK: CardanoNetwork = 'preprod';
