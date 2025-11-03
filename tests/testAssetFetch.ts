import { FirstStageSDK } from "../src/client.js";

async function main() {
  const assetId = 2154668640;

  const assetInfo = await FirstStageSDK.fetchAssetInfo(assetId, 'mainnet');
  console.log('Asset Info (default node):', assetInfo);
}

main().catch(console.error);
