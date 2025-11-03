import { FirstStageSDK } from "../src/client.js";
import type { SwapProvider } from "@perawallet/swap";

// --- Asset Info ---
const ASSET_IN_ID = 2154668640;
const ASSET_OUT_ID = 3159727942;
const AMOUNT = 100_00000000;
const NETWORK: "mainnet" | "testnet" = "mainnet";

// --- Pera Swap Providers ---
const PROVIDERS: SwapProvider[] = ["tinyman", "vestige-v4"];

async function main() {
  try {
    const sdk = new FirstStageSDK(NETWORK);

    const quote = await sdk.fetchPeraQuoteWithTax({
      fromAssetId: Number(ASSET_IN_ID),
      toAssetId: Number(ASSET_OUT_ID),
      amount: Number(AMOUNT),
      userAddress: "NOLXAGDW6KLLX3GRIVGU72HPHW7WWUN2VE7GUZOLYKEG7FGM6FENVFFEXQ", 
      providers: PROVIDERS, 
    });

    console.log("=== Pera Quote Test ===");
    console.log("From Asset ID:", ASSET_IN_ID);
    console.log("To Asset ID:", ASSET_OUT_ID);
    console.log("Amount (micro units):", AMOUNT.toString());
    console.log("Providers:", PROVIDERS);
    console.log("Quote (tax-adjusted):", quote);
  } catch (err) {
    console.error("Error generating Pera quote:", err);
  }
}

main();