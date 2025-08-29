import { FirstStageSDK } from './dist/client.js';

async function main() {
  const assetId = 743312173;

  // Custom algod node config
  const algodConfig = {
    token: 'your-token',
    server: 'https://testnet-api.algonode.cloud',
    port: ''
  };

  // Static fetch with custom node
  const assetInfo = await FirstStageSDK.fetchAssetInfo(assetId, 'testnet', undefined, algodConfig);
  console.log('Asset Info (custom node):', assetInfo);

  // Default static fetch
  const assetInfo2 = await FirstStageSDK.fetchAssetInfo(assetId, 'testnet');
  console.log('Asset Info (default node):', assetInfo2);
}

main().catch(console.error);
