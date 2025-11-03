import { FirstStageSDK } from "../src/client.js";
import algosdk from "algosdk";

const APP_ID = 3158291365;
const USER_ADDRESS = "RQKQSLFSMZNXH62IB7PFL5D5FNLV64OKE7GP4MWPMUVUEXOLDTIFH6XKIY";
const SAMPLE_ASSET_ID = 2154668640;
const REFREEZE_ADDRESS = "H3A7GQA62RWHF2B7M7VOB3WFEZXCTL63J56SFITK7PAJ6OWLCCQYVR6UTI";

async function main() {
  console.log("Step 1: Constructing SDK...");
  const sdk = new FirstStageSDK("mainnet");
  console.log("Step 2: SDK constructed successfully");

  // --- Dummy signer (for testing) ---
  const dummySigner: algosdk.TransactionSigner = async (txnGroup: algosdk.Transaction[]) => {
    return txnGroup.map(() => new Uint8Array()); // empty signature for testing
  };

console.log("Step 3: Calling generateFreezeTxnGroup...");
const composer = await sdk.generateFreezeTxnGroup(
  USER_ADDRESS,
  SAMPLE_ASSET_ID,
  REFREEZE_ADDRESS,
  dummySigner
);

if (!composer) {
  console.log("User is not freeze-eligible; no freeze transactions generated.");
  return;
}

console.log("Step 4: generateFreezeTxnGroup returned successfully");

const builtTxns = await composer.buildTransactions();
console.log(`Step 5: Built freeze transactions: ${builtTxns.transactions.length}`);

  // Helper to display transactions
  function mapToObject(input: any): any {
    if (input instanceof Map) {
      const obj: Record<string, any> = {};
      for (const [key, value] of input.entries()) obj[key.toString()] = mapToObject(value);
      return obj;
    } else if (Array.isArray(input)) return input.map(mapToObject);
    else if (input instanceof Uint8Array) return Buffer.from(input).toString("hex");
    else if (typeof input === "bigint") return input.toString();
    else if (input && typeof input === "object" && "publicKey" in input) return algosdk.encodeAddress(input.publicKey);
    else if (input && typeof input === "object") {
      const obj: Record<string, any> = {};
      for (const key of Object.keys(input)) obj[key] = mapToObject(input[key]);
      return obj;
    }
    return input;
  }

  builtTxns.transactions.forEach((txn, i) => {
    console.log(`\nFreeze Txn #${i}`);
    console.log(JSON.stringify(mapToObject(txn.getEncodingSchema()), null, 2));
  });

  console.log("Freeze transaction test completed");
}

main();