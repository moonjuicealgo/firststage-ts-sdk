import { FirstStageSDK } from "../src/client.js";
import algosdk from "algosdk";

const USER_ADDRESS = "TTQ23YABGCTL2NU7PRZGEX7WF5RSXDH7W3M47UZ2G3OXOZ52SH7UHMXFWA";
const POOL_ADDRESS = "";
const SAMPLE_ASSET_ID = 2154668640;
const LP_ASSET_ID = 3196326786;
const LP_APP_ID = 1002541853;

async function main() {
  const sdk = new FirstStageSDK("mainnet");
  const suggestedParams = await sdk.getAlgod().getTransactionParams().do();

  // --- Dummy DEX withdraw txn ---
  const dummyWithdrawTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: USER_ADDRESS,
    receiver: POOL_ADDRESS,
    assetIndex: LP_ASSET_ID,
    amount: 500_000_000n,
    suggestedParams,
  });

  // --- Wrap transaction with dummy signer ---
  const dummySigner: algosdk.TransactionSigner = async (txnGroup: algosdk.Transaction[]) => {
    return txnGroup.map(() => new Uint8Array());
  };

  const userTxns: { txn: algosdk.Transaction; signer: algosdk.TransactionSigner }[] = [
    { txn: dummyWithdrawTxn, signer: dummySigner },
  ];

  // --- Withdraw amounts map ---
  const withdrawAmounts = new Map<number, bigint>();
  withdrawAmounts.set(SAMPLE_ASSET_ID, 500_000_000n);

  // --- Generate Remove Liquidity Group ---
  const composer = await sdk.generateRemoveLiquidityGroup(
    USER_ADDRESS,
    [SAMPLE_ASSET_ID],
    LP_ASSET_ID,
    userTxns,
  );

  const builtTxns = await composer.buildTransactions();

  // --- Helper to print transactions ---
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
    console.log(`\nTxn #${i}`);
    console.log(JSON.stringify(mapToObject(txn.toEncodingData()), null, 2));
  });

  console.log("Remove Liquidity Group test completed successfully");
}

main().catch(console.error);