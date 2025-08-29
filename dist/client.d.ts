import type { AssetInformation, UserAssetInfo } from './decoders.js';
export declare class FirstStageSDK {
    private algod;
    private appId;
    private algorandClient;
    constructor(appId?: number, network?: 'testnet' | 'mainnet', algodConfig?: {
        token: string;
        server: string;
        port: string;
    });
    /** Fetch and decode asset box */
    getAssetBox(assetId: number): Promise<AssetInformation | null>;
    /** Fetch user-specific box */
    getUserBox(assetId: number, userAddress: string): Promise<Uint8Array | null>;
    /** Fetch user asset info including ABI read-only reflection */
    getUserAssetInfo(assetId: number, userAddress: string): Promise<UserAssetInfo | null>;
    /** Static helper: fetch asset info without SDK instantiation */
    static fetchAssetInfo(assetId: number, network?: 'testnet' | 'mainnet', appId?: number, algodConfig?: {
        token: string;
        server: string;
        port: string;
    }): Promise<AssetInformation | null>;
}
//# sourceMappingURL=client.d.ts.map