import { FirstStageSDK } from "../src/client.js";
import algosdk from "algosdk";

const USER_ADDRESS = "TTQ23YABGCTL2NU7PRZGEX7WF5RSXDH7W3M47UZ2G3OXOZ52SH7UHMXFWA";

async function main() {
  const sdk = new FirstStageSDK("mainnet");

  const sampleLpAssetId = 3196326786

  const userDeposit = await sdk.getUserDeposit(USER_ADDRESS, sampleLpAssetId);

  if (!userDeposit) {
    console.log("No deposit info found for this user/LP asset combination.");
    return;
  }

  console.log("Locked asset ID:", userDeposit.locked_asset_id.toString());
  console.log("LP deposit:", userDeposit.lp_deposit.toString());
  console.log("Locked LP tokens:", userDeposit.locked_lp_tokens.toString());
  console.log("LP app ID:", userDeposit.lp_app_id.toString());
  console.log("Second locked asset ID:", userDeposit.second_locked_asset_id.toString());
  console.log("Second LP deposit:", userDeposit.second_lp_deposit.toString());
}

main().catch(console.error);