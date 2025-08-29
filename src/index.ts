export interface AssetInformation {
  admin_wallet: string;
  main_pool: string;
  project_tax_bps: bigint;
  burn_tax_bps: bigint;
  reflection_tax_bps: bigint;
  freeze_tax_bps: bigint;
  freeze_reward_bps: bigint;
  liquidity_deposit_bps: bigint;
  reflection_token_index: bigint;
  reflection_algo_index: bigint;
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
}

export interface UserAssetInfo {
  latest_reflection_token_index: bigint;
  latest_reflection_algo_index: bigint;
  pending_reflections_tokens: bigint;
  pending_reflections_algo: bigint;
  claimable_freeze_rewards: bigint;
  registered_balance: bigint;
}
