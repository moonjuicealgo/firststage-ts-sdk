import { FirstStageSDK } from "../src/client.js";

async function main() {
  const sdk = new FirstStageSDK('mainnet');

  console.log("Fetching FirstStage assets for app:", sdk.clientAppId);

  const assets = await sdk.listFirstStageAssets();

  if (!assets.length) {
    console.log("❌ No FirstStage assets found (main app not opted into any).");
    return;
  }

  console.log(`✅ Found ${assets.length} FirstStage assets:\n`);

  for (const { assetId, info } of assets) {
    console.log("─────────────────────────────");
    console.log("Asset ID:", assetId);
    console.log("Admin Account:", info.admin_account);
    console.log("Main Pool:", info.main_pool);
    console.log("Project Tax BPS:", info.project_tax_bps.toString());
    console.log("Total Tax BPS:", info.total_tax_bps.toString());
  }
}

main().catch((err) => {
  console.error("🚨 Test failed:", err);
});