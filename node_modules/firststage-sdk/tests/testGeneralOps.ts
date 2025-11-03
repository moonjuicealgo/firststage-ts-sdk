import { FirstStageSDK } from "../src/client.js";
import algosdk from "algosdk";

const USER_ADDRESS = "RQKQSLFSMZNXH62IB7PFL5D5FNLV64OKE7GP4MWPMUVUEXOLDTIFH6XKIY";
const RECEIVER_ADDRESS = "BNFIREKGRXEHCFOEQLTX3PU5SUCMRKDU7WHNBGZA4SXPW42OAHZBP7BPHY";
const SAMPLE_ASSET_ID = 2154668640;
const REFERRAL_ADDRESS = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

async function main() {
  const sdk = new FirstStageSDK("mainnet");
  const suggestedParams = await sdk.getAlgod().getTransactionParams().do();

  // --- Dummy user transaction ---
  const dummyTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: USER_ADDRESS,
    receiver: RECEIVER_ADDRESS,
    assetIndex: SAMPLE_ASSET_ID,
    amount: 1000_00000000,
    suggestedParams,
  });

  // --- LogicSig user transaction ---
  const logicSigProgram = new Uint8Array([0x01, 0x20, 0x01]); // minimal dummy TEAL
  const lsig = new algosdk.LogicSigAccount(logicSigProgram);
  const lsigTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: lsig.address(),
    receiver: RECEIVER_ADDRESS,
    assetIndex: SAMPLE_ASSET_ID,
    amount: 500_00000000,
    suggestedParams,
  });

  // --- Signers ---
  const dummySigner: algosdk.TransactionSigner = async (txnGroup: algosdk.Transaction[]) => {
    return txnGroup.map(() => new Uint8Array()); // empty signature for testing
  };

const lsigSigner: algosdk.TransactionSigner = async (txnGroup: algosdk.Transaction[]) => {
  return txnGroup.map(txn => {
    const signedTxn = algosdk.signLogicSigTransaction(txn, lsig);
    return signedTxn.blob; // Uint8Array
  });
};

  // --- Wrap transactions with their signers ---
  const userTxns: { txn: algosdk.Transaction; signer: algosdk.TransactionSigner }[] = [
    { txn: dummyTxn, signer: dummySigner },
    { txn: lsigTxn, signer: lsigSigner },
  ];

  const composer = await sdk.generateGeneralOpsGroup(
    USER_ADDRESS,
    [SAMPLE_ASSET_ID],
    userTxns,
    REFERRAL_ADDRESS
  );

  const builtTxns = await composer.buildTransactions();

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

  console.log("Test completed successfully");
}

main();