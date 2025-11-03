import algosdk from 'algosdk';
import { FirstStageSDK } from "../src/client.js";

const USER_ADDRESS = 'CYBYNHUREXXKIJHSYIQAKVJ3BDMNCEPWYMA3VBEEBKYLEAUL5635SHR7JE';

async function main() {
  const sdk = new FirstStageSDK('mainnet');
  const sampleAssetId = 2154668640; 
  const userInfo = await sdk.getUserAssetInfo(sampleAssetId, USER_ADDRESS);

  if (!userInfo) {
    console.log('No asset info found for this user/asset combination.');
    return;
  }

  console.log('Claimable freeze rewards:', userInfo.claimable_freeze_rewards.toString());
  console.log('Registered balance:', userInfo.registered_balance.toString());
  console.log('Pending reflections tokens:', userInfo.pending_reflections_tokens.toString());
  console.log('Pending reflections ALGO:', userInfo.pending_reflections_algo.toString());
}

main().catch(console.error);
