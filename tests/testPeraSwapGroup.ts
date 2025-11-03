import algosdk from "algosdk";
import { FirstStageSDK } from "../src/client.js";

// --- Asset Info ---
const ASSET_IN_ID = 2154668640;
const ASSET_OUT_ID = 0;
const AMOUNT = 100_00000000n;
const NETWORK: "mainnet" | "testnet" = "mainnet";

// --- User Info ---
const USER_ADDRESS = "NOLXAGDW6KLLX3GRIVGU72HPHW7WWUN2VE7GUZOLYKEG7FGM6FENVFFEXQ";
const REFERRAL_ADDRESS = "RQKQSLFSMZNXH62IB7PFL5D5FNLV64OKE7GP4MWPMUVUEXOLDTIFH6XKIY";

// Dummy signer for testing (doesn't actually sign)
const dummySigner: algosdk.TransactionSigner = async (txnGroup) =>
  txnGroup.map(() => new Uint8Array());

async function main() {
  try {
    const sdk = new FirstStageSDK(NETWORK);

// --- Fetch PeraSwap quote (tax-adjusted) ---
const bestQuote = await sdk.fetchPeraQuoteWithTax({
  fromAssetId: Number(ASSET_IN_ID),
  toAssetId: Number(ASSET_OUT_ID),
  amount: Number(AMOUNT),
  userAddress: USER_ADDRESS,
  slippage: 0.005,
});

if (!bestQuote) throw new Error("No PeraSwap quote returned");

// --- Generate full PeraSwap swap group using the existing quote ---
const composer = await sdk.generatePeraSwapGroup(
  USER_ADDRESS,               // userAddress
  ASSET_IN_ID,                // fromAssetId
  ASSET_OUT_ID,               // toAssetId
  Number(AMOUNT),             // amount
  REFERRAL_ADDRESS,           // referralAddress
  0.005,                      // slippage
  ["tinyman", "vestige-v4"],  // providers
  dummySigner,                // defaultSigner
  bestQuote.quote_id_str       // pass the existing quote ID here
);


    const builtTxns = await composer.buildTransactions();

    // --- Utility to map transaction objects to printable JSON ---
    function mapToObject(input: any): any {
      if (input instanceof Map) {
        const obj: Record<string, any> = {};
        for (const [key, value] of input.entries()) obj[key.toString()] = mapToObject(value);
        return obj;
      } else if (Array.isArray(input)) return input.map(mapToObject);
      else if (input instanceof Uint8Array) return Buffer.from(input).toString("hex");
      else if (typeof input === "bigint") return input.toString();
      else if (input && typeof input === "object" && "publicKey" in input)
        return algosdk.encodeAddress(input.publicKey);
      else if (input && typeof input === "object") {
        const obj: Record<string, any> = {};
        for (const key of Object.keys(input)) obj[key] = mapToObject(input[key]);
        return obj;
      }
      return input;
    }

    // --- Print all transactions ---
    builtTxns.transactions.forEach((txn, i) => {
      console.log(`\nTxn #${i}`);
      console.log(JSON.stringify(mapToObject(txn.toEncodingData()), null, 2));
    });
    console.log(bestQuote.provider)
    console.log("✅ PeraSwap swap generation test completed successfully");
  } catch (err: any) {
    console.error("❌ Error generating PeraSwap swap group:");
    console.dir(err, { depth: null });
    console.error("Raw stringified:", JSON.stringify(err, null, 2));
    if (err?.response) console.error("Response body:", err.response.data || err.response.body);
  }
}

main();