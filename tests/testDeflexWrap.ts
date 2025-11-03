// tests/testDeflexWrap.ts
import algosdk from "algosdk";
import "dotenv/config";
import { FirstStageSDK } from "../src/client.js";
import type { FirstStageDeflexQuote } from "../src/client.js";
import type { FirstStageSwapTxnsResponse } from "../src/index.js";
import fetch from "node-fetch";

const NETWORK = "mainnet";
const USER_ADDRESS = "B4AUVUUVV7QCQU6LAA2IMNLCT45T6XSL7436TRNCBTKIRV4F5Y6R4I24CU";
const REFERRAL_ADDRESS = "B4AUVUUVV7QCQU6LAA2IMNLCT45T6XSL7436TRNCBTKIRV4F5Y6R4I24CU";
const DEFLEX_API_KEY = "";
const ASSET_IN_ID = 31566704; // USDC
const ASSET_OUT_ID = 0; // ALGO

const AMOUNT_MICRO = 1_000_000; // 1 USDC

const dummySigner: algosdk.TransactionSigner = async (txnGroup) =>
  txnGroup.map(() => new Uint8Array());

async function main() {
  try {
    const sdk = new FirstStageSDK(NETWORK);

    console.log("🔹 Fetching Deflex quote...");
    const quote: FirstStageDeflexQuote = await sdk.fetchDeflexQuoteWithTax({
      fromAssetId: ASSET_IN_ID,
      toAssetId: ASSET_OUT_ID,
      amount: AMOUNT_MICRO, // <-- already micro-units
      type: "fixed-input",
      network: NETWORK,
      deflexApiKey: DEFLEX_API_KEY,
    });

    if (!quote.txnPayload) throw new Error("Quote payload missing");

    console.log("Quote fetched successfully");

const swapResponse = (await fetch(
  "https://deflex.txnlab.dev/api/fetchExecuteSwapTxns",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: USER_ADDRESS,
      txnPayloadJSON: quote.txnPayload,
      slippage: 0.005,
      apiKey: DEFLEX_API_KEY,
    }),
  },
).then(res => res.json())) as FirstStageSwapTxnsResponse;

    console.log("Swap transactions fetched successfully");

    const composer = await sdk.wrapDeflexSwapGroup(
      swapResponse,
      USER_ADDRESS,
      REFERRAL_ADDRESS,
      ASSET_IN_ID,
      ASSET_OUT_ID,
      0.005,
      dummySigner,
    );

    const builtTxns = await composer.buildTransactions();

    console.log("\n✅ Test completed successfully");
  } catch (err: any) {
    console.error("\n❌ Error during wrapDeflexSwapGroup test:");
    console.dir(err, { depth: null });
    console.error("Raw stringified:", JSON.stringify(err, null, 2));
    if (err?.response) console.error("Response body:", err.response.data || err.response.body);
    process.exit(1);
  }
}

main();
