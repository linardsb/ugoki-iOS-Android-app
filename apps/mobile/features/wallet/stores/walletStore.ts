import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/shared/stores/storage';
import type {
  WalletState,
  WalletInfo,
  TokenBalance,
  PendingReward,
  CardanoNetwork,
  StreakMilestoneTracker,
} from '../types';
import { CURRENT_NETWORK } from '../types';
import { fetchWalletBalance } from '../services/cardano';

interface WalletStore extends WalletState {
  // Connection actions
  connect: (address: string, network?: CardanoNetwork, walletName?: string) => void;
  disconnect: () => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;

  // Balance actions
  setBalance: (balance: TokenBalance) => void;
  refreshBalance: () => Promise<void>;

  // Rewards actions
  addPendingReward: (reward: Omit<PendingReward, 'id' | 'claimed'>) => void;
  markRewardClaimed: (rewardId: string, txHash: string) => void;
  clearClaimedRewards: () => void;

  // Streak milestone tracking
  streakTracker: StreakMilestoneTracker;
  updateStreakCount: (streakType: string, count: number) => void;
  markMilestoneRewarded: (streakType: string, milestone: number) => void;
  isMilestoneRewarded: (streakType: string, milestone: number) => boolean;

  // Transaction tracking
  setLastTxHash: (hash: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState: WalletState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  wallet: null,
  balance: null,
  pendingRewards: [],
  lastTxHash: null,
};

const initialStreakTracker: StreakMilestoneTracker = {
  lastKnownCounts: {},
  rewardedMilestones: {},
};

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      streakTracker: initialStreakTracker,

      // Connect wallet
      connect: (address, network = CURRENT_NETWORK, walletName) => {
        const walletInfo: WalletInfo = {
          address,
          network,
          walletName,
          connectedAt: new Date().toISOString(),
        };

        set({
          isConnected: true,
          isConnecting: false,
          connectionError: null,
          wallet: walletInfo,
        });
      },

      // Disconnect wallet
      disconnect: () => {
        set({
          isConnected: false,
          isConnecting: false,
          connectionError: null,
          wallet: null,
          balance: null,
          // Keep pending rewards - they're tied to identity, not wallet
        });
      },

      // Set connecting state
      setConnecting: (connecting) => {
        set({ isConnecting: connecting, connectionError: null });
      },

      // Set connection error
      setConnectionError: (error) => {
        set({
          connectionError: error,
          isConnecting: false,
          isConnected: false,
        });
      },

      // Update balance
      setBalance: (balance) => {
        set({ balance });
      },

      // Refresh balance from blockchain using Mesh SDK
      refreshBalance: async () => {
        const { wallet } = get();
        if (!wallet) return;

        try {
          const balance = await fetchWalletBalance(wallet.address, wallet.network);
          if (balance) {
            set({ balance });
          }
        } catch (error) {
          console.error('[Wallet] Failed to refresh balance:', error);
          // Keep existing balance on error
        }
      },

      // Add a pending reward (earned but not yet claimed)
      addPendingReward: (reward) => {
        const newReward: PendingReward = {
          ...reward,
          id: `reward_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          claimed: false,
        };

        set((state) => ({
          pendingRewards: [...state.pendingRewards, newReward],
        }));
      },

      // Mark reward as claimed
      markRewardClaimed: (rewardId, txHash) => {
        set((state) => ({
          pendingRewards: state.pendingRewards.map((r) =>
            r.id === rewardId ? { ...r, claimed: true } : r
          ),
          lastTxHash: txHash,
        }));
      },

      // Clear claimed rewards from list
      clearClaimedRewards: () => {
        set((state) => ({
          pendingRewards: state.pendingRewards.filter((r) => !r.claimed),
        }));
      },

      // Update the last known count for a streak type
      updateStreakCount: (streakType, count) => {
        set((state) => ({
          streakTracker: {
            ...state.streakTracker,
            lastKnownCounts: {
              ...state.streakTracker.lastKnownCounts,
              [streakType]: count,
            },
          },
        }));
      },

      // Mark a milestone as rewarded (to prevent double rewards)
      markMilestoneRewarded: (streakType, milestone) => {
        const key = `${streakType}_${milestone}`;
        set((state) => ({
          streakTracker: {
            ...state.streakTracker,
            rewardedMilestones: {
              ...state.streakTracker.rewardedMilestones,
              [key]: true,
            },
          },
        }));
      },

      // Check if a milestone has already been rewarded
      isMilestoneRewarded: (streakType, milestone) => {
        const key = `${streakType}_${milestone}`;
        return get().streakTracker.rewardedMilestones[key] === true;
      },

      // Set last transaction hash
      setLastTxHash: (hash) => {
        set({ lastTxHash: hash });
      },

      // Reset all state
      reset: () => {
        set({ ...initialState, streakTracker: initialStreakTracker });
      },
    }),
    {
      name: 'wallet-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        // Persist connection and rewards
        isConnected: state.isConnected,
        wallet: state.wallet,
        balance: state.balance,
        pendingRewards: state.pendingRewards,
        lastTxHash: state.lastTxHash,
        // Persist streak milestone tracking
        streakTracker: state.streakTracker,
      }),
    }
  )
);

// Selectors
export const useIsWalletConnected = () => useWalletStore((s) => s.isConnected);
export const useWalletAddress = () => useWalletStore((s) => s.wallet?.address);
export const useWalletBalance = () => useWalletStore((s) => s.balance);
export const usePendingRewards = () => useWalletStore((s) => s.pendingRewards);
export const useUnclaimedRewardsCount = () =>
  useWalletStore((s) => s.pendingRewards.filter((r) => !r.claimed).length);
export const useTotalPendingUgoki = () =>
  useWalletStore((s) =>
    s.pendingRewards
      .filter((r) => !r.claimed)
      .reduce((sum, r) => sum + parseInt(r.amount, 10), 0)
      .toString()
  );

// Streak tracking selectors
export const useStreakTracker = () => useWalletStore((s) => s.streakTracker);
export const useLastKnownStreakCount = (streakType: string) =>
  useWalletStore((s) => s.streakTracker.lastKnownCounts[streakType] ?? 0);
