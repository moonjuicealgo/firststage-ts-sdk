import algosdk, { Algodv2 } from "algosdk";
import type { AssetInformation, UserAssetInfo, UserDepositInfo } from "./decoders.js";
import { TransactionComposer } from "@algorandfoundation/algokit-utils/types/composer";
import { UserTxnWithSigner, FirstStageSwapTxnsResponse } from "./index.js";
import { SwapProvider } from "@perawallet/swap";
export interface FirstStagePeraQuote {
    id: number;
    quote_id_str: string;
    asset_in_id: number;
    asset_out_id: number;
    amount: string;
    amount_out: string;
    exchange_fee_amount: string;
    taxedAmount: number;
    minReceived?: number;
    fromAssetInfo: AssetInformation | null;
    toAssetInfo: AssetInformation | null;
}
export interface FirstStageDeflexQuote {
    quote: number | string;
    profitAmount: number;
    profitASAID: number;
    usdIn: number;
    usdOut: number;
    userPriceImpact: number;
    route: {
        percent: number;
        path: {
            name: string;
            in: {
                id: number;
            };
            out: {
                id: number;
            };
        }[];
    }[];
    quotes: {
        name: string;
        value: number | string;
    }[];
    requiredAppOptIns: number[];
    txnPayload: Record<string, string> | null;
    fromAPIResponse?: any;
}
export declare class FirstStageSDK {
    private algod;
    private algodConfig;
    private appId;
    private algorandClient;
    private baseClient?;
    private fsClient;
    private lpClient;
    private network;
    get clientParams(): {
        update: {
            bare: (params?: import("./generated/FirstStage.js").Expand<import("@algorandfoundation/algokit-utils/types/app-client").AppClientBareCallParams & import("@algorandfoundation/algokit-utils/types/app-client").AppClientCompilationParams>) => any;
        };
        clearState: (params?: import("./generated/FirstStage.js").Expand<import("@algorandfoundation/algokit-utils/types/app-client").AppClientBareCallParams>) => any;
        setGlobalState: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["set_global_state(uint64,uint64,account,uint64,uint64,uint64,uint64,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["set_global_state(uint64,uint64,account,uint64,uint64,uint64,uint64,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        exemptWallet: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["exempt_wallet(uint64,account,uint64,string,pay)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["exempt_wallet(uint64,account,uint64,string,pay)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        unfreezeExemptWallet: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["unfreeze_exempt_wallet(account,asset)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["unfreeze_exempt_wallet(account,asset)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        addExemptApp: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["add_exempt_app(uint64,uint64,uint64,string,pay)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["add_exempt_app(uint64,uint64,uint64,string,pay)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        removeExemptWallet: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["remove_exempt_wallet(uint64,account)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["remove_exempt_wallet(uint64,account)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        removeExemptApp: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["remove_exempt_app(uint64,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["remove_exempt_app(uint64,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        globalAdminReset: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["global_admin_reset(account)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["global_admin_reset(account)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        projectAdminReset: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["project_admin_reset(account,asset)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["project_admin_reset(account,asset)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        registerAsa: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["register_asa(asset,pay,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["register_asa(asset,pay,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        reconfigureAsset: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["reconfigure_asset(asset,account,uint64,uint64,uint64,uint64,uint64,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["reconfigure_asset(asset,account,uint64,uint64,uint64,uint64,uint64,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        switchTaxMode: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["switch_tax_mode(asset,uint64,account)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["switch_tax_mode(asset,uint64,account)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        freeze: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["freeze(asset,account,pay)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["freeze(asset,account,pay)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        generalOperationsTop: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["general_operations_top(uint64,asset,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["general_operations_top(uint64,asset,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        generalOperationsBottom: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["general_operations_bottom(uint64,asset,axfer,account)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["general_operations_bottom(uint64,asset,axfer,account)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        sendToFrozenTop: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["send_to_frozen_top(uint64,asset,uint64,account,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["send_to_frozen_top(uint64,asset,uint64,account,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        sendToFrozenBottom: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["send_to_frozen_bottom(uint64,asset,axfer,account,account)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["send_to_frozen_bottom(uint64,asset,axfer,account,account)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        whitelistedAppTop: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["whitelisted_app_top(uint64,asset,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["whitelisted_app_top(uint64,asset,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        whitelistedAppBottom: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["whitelisted_app_bottom(uint64,asset)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["whitelisted_app_bottom(uint64,asset)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        liquidityTop: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["liquidity_top(uint64,asset,asset,uint64,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["liquidity_top(uint64,asset,asset,uint64,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        liquidityBottom: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["liquidity_bottom(uint64,asset)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["liquidity_bottom(uint64,asset)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        addRewardsTop: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["add_rewards_top(uint64,asset,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["add_rewards_top(uint64,asset,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        addRewardsBottom: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["add_rewards_bottom(uint64,asset,uint64,axfer)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["add_rewards_bottom(uint64,asset,uint64,axfer)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        addAlgoRewards: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["add_algo_rewards(asset,pay)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["add_algo_rewards(asset,pay)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        exemptAppApproval: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["exempt_app_approval(uint64,asset,string)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["exempt_app_approval(uint64,asset,string)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        exemptOrWhitelistApp: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["exempt_or_whitelist_app(uint64,asset,string,pay,uint64)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["exempt_or_whitelist_app(uint64,asset,string,pay,uint64)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        removeUserBox: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["remove_user_box(asset,account)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["remove_user_box(asset,account)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        claimReflections: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["claim_reflections(asset)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["claim_reflections(asset)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        claimFreezeRewards: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["claim_freeze_rewards(asset)void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["claim_freeze_rewards(asset)void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        checkIsAddressExempt: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["check_is_address_exempt(account,asset)bool"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["check_is_address_exempt(account,asset)bool"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        checkIsAddressMaybeExemptApp: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["check_is_address_maybe_exempt_app(account,asset)bool"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["check_is_address_maybe_exempt_app(account,asset)bool"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        checkIsAppWhitelisted: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["check_is_app_whitelisted(uint64)bool"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["check_is_app_whitelisted(uint64)bool"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        checkIsAppExempt: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["check_is_app_exempt(uint64)bool"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["check_is_app_exempt(uint64)bool"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        checkLpDepositBps: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["check_lp_deposit_bps(asset)uint64"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["check_lp_deposit_bps(asset)uint64"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        increaseBudget: (params?: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["increase_budget()void"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["increase_budget()void"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
        getReflectionPreview: (params: import("./generated/FirstStage.js").CallParams<import("./generated/FirstStage.js").FirstStageArgs["obj"]["get_reflection_preview(asset,account)(uint64,uint64)"] | import("./generated/FirstStage.js").FirstStageArgs["tuple"]["get_reflection_preview(asset,account)(uint64,uint64)"]> & {
            onComplete?: algosdk.OnApplicationComplete.NoOpOC;
        }) => any;
    };
    get clientAppId(): any;
    constructor(network?: "testnet" | "mainnet", algodConfig?: {
        token: string;
        server: string;
        port: string;
    });
    getAlgod(): Algodv2;
    getAssetInformation(assetId: number): Promise<AssetInformation | null>;
    listFirstStageAssets(): Promise<{
        assetId: number;
        info: AssetInformation;
    }[]>;
    getUserInformation(assetId: number, userAddress: string): Promise<Uint8Array | null>;
    isFreezeEligible(address: string, assetId: number): Promise<boolean>;
    getUserAssetInfo(assetId: number, userAddress: string): Promise<UserAssetInfo | null>;
    fetchDeflexQuoteWithTax({ userAddress, fromAssetId, toAssetId, amount, type, disabledProtocols, feeBps, deflexReferrerAddress, network, deflexApiUrl, deflexApiKey, algodToken, algodServer, algodPort, slippage, maxGroupSize, }: {
        userAddress?: string;
        fromAssetId: number;
        toAssetId: number;
        amount: number;
        type?: "fixed-input" | "fixed-output";
        disabledProtocols?: string[];
        feeBps?: number;
        deflexReferrerAddress?: string;
        network?: "mainnet" | "testnet";
        deflexApiUrl?: string;
        deflexApiKey?: string;
        algodToken?: string;
        algodServer?: string;
        algodPort?: string | number;
        slippage?: number;
        maxGroupSize?: number;
    }): Promise<FirstStageDeflexQuote>;
    /**
     * Checks whether a user’s asset holding is currently frozen.
     * Returns true if the asset is frozen for the given address.
     */
    isFrozen(userAddress: string, assetId: number): Promise<boolean>;
    generateGeneralOpsGroup(userAddress: string, assetIds: number[], userTxns: UserTxnWithSigner[], referralAddress: string, defaultSigner?: algosdk.TransactionSigner): Promise<TransactionComposer>;
    wrapDeflexSwapGroup(apiResponse: FirstStageSwapTxnsResponse, userAddress: string, referralAddress: string, fromAssetId: number, toAssetId: number, slippage?: number, defaultSigner?: algosdk.TransactionSigner): Promise<TransactionComposer>;
    generateDeflexSwapGroup(quotePayload: Record<string, string> | null, userAddress: string, referralAddress: string, fromAssetId: number, toAssetId: number, slippage?: number, defaultSigner?: algosdk.TransactionSigner, apiKey?: string): Promise<TransactionComposer>;
    fetchPeraQuoteWithTax({ fromAssetId, toAssetId, amount, userAddress, slippage, providers, }: {
        fromAssetId: number;
        toAssetId: number;
        amount: number;
        userAddress: string;
        slippage?: number;
        providers?: SwapProvider[];
    }): Promise<{
        taxedAmount: number;
        minReceived: number | undefined;
        fromAssetInfo: AssetInformation | null;
        toAssetInfo: AssetInformation | null;
        id?: number;
        quote_id_str?: string;
        provider?: SwapProvider;
        swap_type?: import("@perawallet/swap").SwapType;
        swapper_address?: string;
        asset_in?: import("@perawallet/swap").Asset;
        asset_out?: import("@perawallet/swap").Asset;
        amount_in?: string;
        amount_in_with_slippage?: string;
        amount_in_usd_value?: null | string;
        amount_out?: string;
        amount_out_with_slippage?: string;
        amount_out_usd_value?: null | string;
        slippage?: string;
        price?: string;
        price_impact?: string;
        pera_fee_amount?: string;
        exchange_fee_amount?: string;
    }>;
    generatePeraSwapGroup(userAddress: string, fromAssetId: number, toAssetId: number, amount: number, referralAddress: string, slippage?: number, providers?: ("tinyman" | "vestige-v4" | "tinyman-swap-router")[], defaultSigner?: algosdk.TransactionSigner, quoteIdStr?: string): Promise<TransactionComposer>;
    generateAddLiquidityGroup(userAddress: string, assetIds: number[], lpAssetId: number, lpAppId: number, userTxns: UserTxnWithSigner[], depositAmounts: Map<number, bigint>, defaultSigner?: algosdk.TransactionSigner): Promise<TransactionComposer>;
    generateRemoveLiquidityGroup(userAddress: string, assetIds: number[], lpAssetId: number, userTxns: UserTxnWithSigner[], defaultSigner?: algosdk.TransactionSigner): Promise<TransactionComposer>;
    getUserDeposit(userAddress: string, lpAssetId: number): Promise<UserDepositInfo>;
    generateFreezeTxnGroup(userAddress: string, assetId: number, refreezeAddress: string, signer?: algosdk.TransactionSigner): Promise<TransactionComposer | null>;
    static fetchAssetInfo(assetId: number, network?: "testnet" | "mainnet", algodConfig?: {
        token: string;
        server: string;
        port: string;
    }): Promise<AssetInformation | null>;
}
//# sourceMappingURL=client.d.ts.map