/**
 * UGOKI Token Minting Script for Cardano Preprod Testnet
 *
 * This script mints the $UGOKI token using Lucid and Blockfrost.
 *
 * Usage:
 *   bun install
 *   bun run mint-ugoki.ts generate    # Generate a new wallet
 *   bun run mint-ugoki.ts mint        # Mint tokens (requires WALLET_SEED)
 */

import { Lucid, Blockfrost, fromText, mintingPolicyToId, scriptFromNative, generateSeedPhrase } from "@lucid-evolution/lucid";

// ============ CONFIGURATION ============
const CONFIG = {
  // Blockfrost API (preprod) - note: no /api suffix for Lucid
  BLOCKFROST_URL: "https://cardano-preprod.blockfrost.io/api/v0",
  BLOCKFROST_API_KEY: "preprodRi4HgdejrokotxWFBKtTLPc560ODoEnK",

  // Token details
  TOKEN_NAME: "UGOKI",
  TOKEN_TICKER: "$UGOKI",
  TOTAL_SUPPLY: 1_000_000_000n, // 1 billion tokens
  DECIMALS: 6,

  // Token metadata (CIP-25)
  METADATA: {
    name: "UGOKI",
    description: "Fitness rewards token for the UGOKI wellness app",
    ticker: "UGOKI",
    url: "https://ugoki.app",
    decimals: 6,
  },
};

// ============ GENERATE WALLET ============
async function generateWallet() {
  console.log("🔐 Generating New Cardano Wallet");
  console.log("================================\n");

  try {
    // Initialize Lucid with Blockfrost
    const lucid = await Lucid(
      new Blockfrost(CONFIG.BLOCKFROST_URL, CONFIG.BLOCKFROST_API_KEY),
      "Preprod"
    );

    // Generate seed phrase
    const seedPhrase = generateSeedPhrase();

    // Derive address from seed
    lucid.selectWallet.fromSeed(seedPhrase);
    const address = await lucid.wallet().address();

    console.log("✅ Wallet Generated!\n");
    console.log("================================");
    console.log("⚠️  SAVE THIS SEED PHRASE SECURELY!");
    console.log("================================\n");
    console.log(seedPhrase);
    console.log("\n================================");
    console.log(`\n📍 Your Preprod Address:\n${address}\n`);
    console.log("================================");
    console.log("NEXT STEPS:");
    console.log("================================");
    console.log("1. SAVE the seed phrase above (write it down!)");
    console.log("2. Get test ADA from the faucet:");
    console.log("   https://docs.cardano.org/cardano-testnets/tools/faucet/");
    console.log(`   Enter address: ${address}`);
    console.log("3. Wait ~20 seconds for the transaction to confirm");
    console.log("4. Run the mint command:");
    console.log(`   WALLET_SEED="${seedPhrase}" bun run mint-ugoki.ts mint\n`);
  } catch (error) {
    console.error("Error generating wallet:", error);
    process.exit(1);
  }
}

// ============ MINT TOKENS ============
async function mintTokens() {
  console.log("🏋️ UGOKI Token Minting Script");
  console.log("================================\n");

  // Check for seed phrase in environment
  const seedPhrase = process.env.WALLET_SEED;
  if (!seedPhrase) {
    console.log("❌ Error: WALLET_SEED environment variable not set\n");
    console.log("Option 1 - Generate a new wallet:");
    console.log("  bun run mint-ugoki.ts generate\n");
    console.log("Option 2 - Use existing seed phrase:");
    console.log('  WALLET_SEED="your 24 word seed phrase" bun run mint-ugoki.ts mint\n');
    process.exit(1);
  }

  try {
    // Initialize Lucid with Blockfrost
    console.log("📡 Connecting to Cardano Preprod...");
    const lucid = await Lucid(
      new Blockfrost(CONFIG.BLOCKFROST_URL, CONFIG.BLOCKFROST_API_KEY),
      "Preprod"
    );

    // Load wallet from seed phrase
    console.log("🔐 Loading wallet...");
    lucid.selectWallet.fromSeed(seedPhrase);

    const address = await lucid.wallet().address();
    console.log(`📍 Wallet address: ${address}\n`);

    // Check balance
    const utxos = await lucid.wallet().getUtxos();
    const totalLovelace = utxos.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n);
    const adaBalance = Number(totalLovelace) / 1_000_000;
    console.log(`💰 Balance: ${adaBalance.toFixed(2)} ADA`);

    if (adaBalance < 5) {
      console.log("\n❌ Insufficient balance. Need at least 5 ADA for minting.");
      console.log("Get test ADA from: https://docs.cardano.org/cardano-testnets/tools/faucet/");
      process.exit(1);
    }

    // Create minting policy (simple signature policy - only this wallet can mint)
    console.log("\n📜 Creating minting policy...");

    const { paymentCredential } = lucid.utils.getAddressDetails(address);
    if (!paymentCredential) {
      throw new Error("Could not get payment credential from address");
    }

    // Simple native script: requires signature from this wallet
    const mintingPolicy = scriptFromNative({
      type: "sig",
      keyHash: paymentCredential.hash,
    });

    const policyId = mintingPolicyToId(mintingPolicy);
    console.log(`🆔 Policy ID: ${policyId}`);

    // Create asset name
    const assetName = fromText(CONFIG.TOKEN_NAME);
    const unit = policyId + assetName;
    console.log(`🪙 Asset: ${unit}\n`);

    // Build minting transaction
    console.log("🔨 Building minting transaction...");

    const tx = await lucid
      .newTx()
      .mintAssets({ [unit]: CONFIG.TOTAL_SUPPLY })
      .attach.MintingPolicy(mintingPolicy)
      .attachMetadata(721, {
        [policyId]: {
          [CONFIG.TOKEN_NAME]: CONFIG.METADATA,
        },
      })
      .complete();

    // Sign transaction
    console.log("✍️  Signing transaction...");
    const signedTx = await tx.sign.withWallet().complete();

    // Submit transaction
    console.log("📤 Submitting transaction...");
    const txHash = await signedTx.submit();

    console.log("\n✅ SUCCESS! Token minted!");
    console.log("================================");
    console.log(`Transaction Hash: ${txHash}`);
    console.log(`Policy ID: ${policyId}`);
    console.log(`Token Name: ${CONFIG.TOKEN_NAME}`);
    console.log(`Total Supply: ${CONFIG.TOTAL_SUPPLY.toLocaleString()}`);
    console.log(`\n🔗 View on explorer:`);
    console.log(`   https://preprod.cardanoscan.io/transaction/${txHash}`);

    console.log("\n📝 IMPORTANT: Save these values!");
    console.log("================================");
    console.log(`Add to your app's types.ts:`);
    console.log(`\nexport const UGOKI_TOKEN_POLICY: Record<CardanoNetwork, string> = {`);
    console.log(`  preprod: '${policyId}',`);
    console.log(`  preview: '',`);
    console.log(`  mainnet: '',`);
    console.log(`};`);

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// ============ MAIN ============
async function main() {
  const command = process.argv[2];

  if (command === "generate") {
    await generateWallet();
    return;
  }

  if (command === "mint") {
    await mintTokens();
    return;
  }

  // Show help
  console.log("🏋️ UGOKI Token Minting Script");
  console.log("================================\n");
  console.log("Commands:");
  console.log("  generate  - Create a new Cardano wallet");
  console.log("  mint      - Mint $UGOKI tokens\n");
  console.log("Examples:");
  console.log("  bun run mint-ugoki.ts generate");
  console.log('  WALLET_SEED="your seed phrase" bun run mint-ugoki.ts mint\n');
}

main();
