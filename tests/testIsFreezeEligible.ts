import { FirstStageSDK } from "../src/client.js";

const APP_ID = 3158291365;
const USER_ADDRESS = "BNFIREKGRXEHCFOEQLTX3PU5SUCMRKDU7WHNBGZA4SXPW42OAHZBP7BPHY";
const SAMPLE_ASSET_ID = 2154668640;

async function main() {
  const sdk = new FirstStageSDK("mainnet");

  try {
    const result = await sdk.isFreezeEligible(USER_ADDRESS, SAMPLE_ASSET_ID);

    console.log(`Address ${USER_ADDRESS} freeze eligible for asset ${SAMPLE_ASSET_ID}? ${result ? "YES" : "NO"}`);
  } catch (err) {
    console.error("Error testing freeze eligibility:", err);
  }
}

main();
