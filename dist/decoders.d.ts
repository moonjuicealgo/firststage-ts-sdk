export interface AssetInformation {
    project_tax_bps: bigint;
    burn_tax_bps: bigint;
    reflection_tax_bps: bigint;
    freeze_tax_bps: bigint;
    freeze_reward_bps: bigint;
    liquidity_deposit_bps: bigint;
    eligible_for_reflections_total: bigint;
    freeze_rewards_available: bigint;
    reflections_tokens_available: bigint;
    reflections_algo_available: bigint;
    minimum_reflections: bigint;
    tokens_collected: bigint;
    algo_collected: bigint;
    pending_project_tax: bigint;
    buy_tax: boolean;
    sell_tax: boolean;
    taxes_in_algo: boolean;
    total_tax_bps: bigint;
}
export interface UserAssetInfo {
    pending_reflections_tokens: bigint;
    pending_reflections_algo: bigint;
    claimable_freeze_rewards: bigint;
    registered_balance: bigint;
}
export declare function decodeAssetBox(bytes: Uint8Array): AssetInformation;
//# sourceMappingURL=decoders.d.ts.map