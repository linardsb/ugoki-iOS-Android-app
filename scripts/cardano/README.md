# UGOKI Token Minting Scripts

Scripts for minting the $UGOKI token on Cardano.

## Prerequisites

1. **Get Test ADA** (for preprod testnet)
   - Go to: https://docs.cardano.org/cardano-testnets/tools/faucet/
   - Select "Preprod" network
   - Enter your Cardano address
   - Request test ADA (~1000 tADA)

2. **Have a Cardano wallet**
   - You need the 24-word seed phrase
   - Recommended: Create a NEW wallet for testing (don't use your main wallet)

## Usage

```bash
# Navigate to this directory
cd scripts/cardano

# Install dependencies
bun install

# Run the minting script (replace with your seed phrase)
WALLET_SEED="your 24 word seed phrase here" bun run mint
```

## Security

⚠️ **NEVER commit your seed phrase to git!**

The script reads the seed phrase from the `WALLET_SEED` environment variable to avoid accidental exposure.

## What the Script Does

1. Connects to Cardano Preprod testnet via Blockfrost
2. Loads your wallet from the seed phrase
3. Creates a simple minting policy (only your wallet can mint)
4. Mints 1,000,000,000 (1 billion) $UGOKI tokens
5. Attaches CIP-25 metadata (token name, description, decimals)
6. Submits the transaction

## After Minting

The script will output:
- **Transaction Hash** - View on CardanoScan
- **Policy ID** - Unique identifier for $UGOKI token

Update the app's `features/wallet/types.ts` with the Policy ID:

```typescript
export const UGOKI_TOKEN_POLICY: Record<CardanoNetwork, string> = {
  preprod: 'YOUR_POLICY_ID_HERE',
  preview: '',
  mainnet: '',
};
```

## Token Details

| Property | Value |
|----------|-------|
| Name | UGOKI |
| Ticker | $UGOKI |
| Total Supply | 1,000,000,000 |
| Decimals | 6 |
| Network | Preprod (testnet) |

## Troubleshooting

**"Insufficient balance"**
- Get test ADA from the faucet (link above)
- Wait for the transaction to confirm (~20 seconds)

**"WALLET_SEED not set"**
- Pass the seed phrase as an environment variable
- Don't put quotes inside the seed phrase itself

**Transaction failed**
- Check your balance on CardanoScan
- Make sure you have at least 5 ADA

---

## $UI Token Economics

### Market Context (2025-2026)

Move-to-Earn market valued at **$2.5B in 2024**, projected to reach **$10B by 2033** (17.4% CAGR).

| Platform | Users | Model |
|----------|-------|-------|
| STEPN | 5.7M | NFT sneakers, dual-token (GST/GMT) |
| Sweatcoin/Sweat Economy | 150M | Free-to-play, step rewards |

Key drivers: fitness gamification, Web3 incentives, wearable integration.

---

### Current $UI Earning Structure

| Activity | $UI Earned |
|----------|------------|
| 12-16h fast | 10 |
| 16-20h fast | 20 |
| 20h+ fast | 40 |
| <15min workout | 5 |
| 15-30min workout | 10 |
| 30min+ workout | 15 |
| 7-day streak | 50 |
| 30-day streak | 200 |
| Achievement unlock | 25-100 |

---

### Implementation Phases

#### Phase 1: Token Rename & Earning Caps
- Rename $UGOKI → $UI across codebase
- Implement daily earning caps (base: 100 $UI/day)
- Streak bonuses: +10 cap per 7-day streak level (max +50)

#### Phase 2: Premium Features Marketplace
| Feature | Cost |
|---------|------|
| Extra AI conversation | 10 $UI |
| Custom workout generation | 25 $UI |
| Personalized meal plan | 30 $UI |
| Premium workout program | 50 $UI |
| Advanced fasting protocol | 40 $UI |
| Custom theme/avatar | 20 $UI |

#### Phase 3: Real-World Assets (RWA)
| Tier | $UI Required | Reward |
|------|--------------|--------|
| Bronze | 500 | 10% discount code |
| Silver | 1,000 | 20% discount + free shipping |
| Gold | 2,500 | 30% discount + exclusive items |

Potential partners: supplement brands, fitness apparel, gym memberships, health food delivery.

#### Phase 4: Gamification Enhancements
- **Earning Multipliers**: 7-day = 1.25x, 14-day = 1.5x, 30-day = 2.0x
- **Daily Quests**: Bonus $UI for completing fasts, workouts, logging measurements
- **Weekly Challenges**: Compete for $UI prize pools

---

### Industry-Proven Incentive Mechanisms

| Mechanism | Description | Example |
|-----------|-------------|---------|
| Premium Features | Unlock AI Coach sessions, advanced analytics | Sweatcoin marketplace |
| In-App Marketplace | Redeem for workout plans, recipes, guides | Sweat Economy |
| NFT Purchases | Buy avatar gear, achievement badges | STEPN sneakers |
| Staking Rewards | Lock tokens to earn more $UI passively | Sweat Growth Jars |
| Partner Discounts | Redeem for fitness gear, supplements | Sweatcoin brand deals |

---

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token Utility | Premium features + RWA | Creates immediate value + long-term incentives |
| Earning Caps | Yes, daily limits | Prevents bot farming, maintains token value |
| On-chain Timing | Off-chain first, on-chain later | Free iteration, real ownership when ready |
| Entry Model | Free-to-play | Maximizes user acquisition (Sweatcoin model) |

---

### Files Modified for $UI Integration

| File | Changes |
|------|---------|
| `apps/mobile/features/wallet/types.ts` | Token types, policy IDs |
| `apps/mobile/features/wallet/stores/walletStore.ts` | Balance state, earning caps |
| `apps/mobile/features/wallet/hooks/useRewards.ts` | Activity-based rewards |
| `apps/mobile/features/wallet/components/TokenBalance.tsx` | Balance display |

---

### Sources

- [Top Move-to-Earn Crypto Projects 2025](https://99bitcoins.com/analysis/top-move-to-earn-crypto/)
- [Move-to-Earn: Fitness Meets Blockchain](https://rmconnection.com/move-to-earn-where-fitness-meets-blockchain-gaming/)
- [Sweatcoin Review 2025](https://coinbureau.com/review/sweatcoin-review/)
- [STEPN Deep Dive](https://gamefipulse.com/2025/05/11/stepn-stepn-go-a-deep-dive-into-move-to-earn-and-web3-fitness/)
- [Web3 Gamification Strategies](https://www.calls9.com/blogs/gamification-in-web3-strategies-economic-potential-and-case-studies)
