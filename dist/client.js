import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { getBoxKeyForAsset, getUserAssetBoxKey } from './boxes.js';
import { decodeAssetBox } from './decoders.js';
import { FirstStageClient } from './generated/FirstStage.js'; // Algokit-generated client
const DEFAULT_APP_IDS = {
    testnet: 743789179,
    mainnet: 3158291365,
};
export class FirstStageSDK {
    algod;
    appId;
    algorandClient;
    constructor(appId, network = 'testnet', algodConfig) {
        this.appId = appId ?? DEFAULT_APP_IDS[network];
        const server = network === 'mainnet'
            ? 'https://mainnet-api.algonode.cloud'
            : 'https://testnet-api.algonode.cloud';
        this.algod = algodConfig
            ? new algosdk.Algodv2(algodConfig.token, algodConfig.server, algodConfig.port)
            : new algosdk.Algodv2('', server, '');
        this.algorandClient = AlgorandClient.fromConfig({
            algodConfig: {
                token: algodConfig?.token ?? '',
                server: algodConfig?.server ?? server,
                port: algodConfig?.port ?? '',
            },
        });
    }
    /** Fetch and decode asset box */
    async getAssetBox(assetId) {
        try {
            const key = getBoxKeyForAsset(assetId);
            const res = await this.algod.getApplicationBoxByName(this.appId, key).do();
            return decodeAssetBox(new Uint8Array(res.value));
        }
        catch (err) {
            console.error(`Error fetching asset box: ${err}`);
            return null;
        }
    }
    /** Fetch user-specific box */
    async getUserBox(assetId, userAddress) {
        try {
            const key = getUserAssetBoxKey(assetId, userAddress);
            const res = await this.algod.getApplicationBoxByName(this.appId, key).do();
            return new Uint8Array(res.value);
        }
        catch {
            return null;
        }
    }
    /** Fetch user asset info including ABI read-only reflection */
    async getUserAssetInfo(assetId, userAddress) {
        try {
            const userBox = await this.getUserBox(assetId, userAddress);
            if (!userBox)
                return null;
            const view = new DataView(userBox.buffer);
            const readUint64BE = (offset) => {
                const high = view.getUint32(offset, false);
                const low = view.getUint32(offset + 4, false);
                return BigInt(high) * BigInt(2 ** 32) + BigInt(low);
            };
            const claimable_freeze_rewards = readUint64BE(32);
            const registered_balance = readUint64BE(40);
            // Use Algokit-generated client for read-only ABI call
            const client = new FirstStageClient({
                appId: BigInt(this.appId),
                algorand: this.algorandClient,
            });
            const [pending_reflections_tokens, pending_reflections_algo] = await client.getReflectionPreview({
                sender: userAddress,
                args: [BigInt(assetId), userAddress],
            });
            return {
                claimable_freeze_rewards,
                registered_balance,
                pending_reflections_tokens,
                pending_reflections_algo,
            };
        }
        catch (err) {
            console.error(`Failed to fetch user asset info: ${err}`);
            return null;
        }
    }
    /** Static helper: fetch asset info without SDK instantiation */
    static async fetchAssetInfo(assetId, network = 'testnet', appId, algodConfig) {
        const applicationId = appId ?? DEFAULT_APP_IDS[network];
        const server = network === 'mainnet'
            ? 'https://mainnet-api.algonode.cloud'
            : 'https://testnet-api.algonode.cloud';
        const algod = algodConfig
            ? new algosdk.Algodv2(algodConfig.token, algodConfig.server, algodConfig.port)
            : new algosdk.Algodv2('', server, '');
        try {
            const key = getBoxKeyForAsset(assetId);
            const res = await algod.getApplicationBoxByName(applicationId, key).do();
            return decodeAssetBox(new Uint8Array(res.value));
        }
        catch (err) {
            console.warn(`Could not fetch asset info for assetId=${assetId}: ${err}`);
            return null;
        }
    }
}
//# sourceMappingURL=client.js.map