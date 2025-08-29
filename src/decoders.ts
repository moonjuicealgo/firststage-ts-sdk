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

export function decodeAssetBox(bytes: Uint8Array): AssetInformation {
  const view = new DataView(bytes.buffer);

  const readUint64BE = (offset: number) => {
    const high = view.getUint32(offset, false);
    const low = view.getUint32(offset + 4, false);
    return BigInt(high) * 2n ** 32n + BigInt(low);
  };

  const flags = bytes[192] ?? 0;
  const buy_tax = (flags & 0b10000000) !== 0;
  const sell_tax = (flags & 0b01000000) !== 0;
  const taxes_in_algo = (flags & 0b00100000) !== 0;

  const total_tax_bps =
    readUint64BE(64) +
    readUint64BE(72) +
    readUint64BE(80) +
    readUint64BE(88);

  return {
    project_tax_bps: readUint64BE(64),
    burn_tax_bps: readUint64BE(72),
    reflection_tax_bps: readUint64BE(80),
    freeze_tax_bps: readUint64BE(88),
    freeze_reward_bps: readUint64BE(96),
    liquidity_deposit_bps: readUint64BE(104),
    eligible_for_reflections_total: readUint64BE(128),
    freeze_rewards_available: readUint64BE(136),
    reflections_tokens_available: readUint64BE(144),
    reflections_algo_available: readUint64BE(152),
    minimum_reflections: readUint64BE(160),
    tokens_collected: readUint64BE(168),
    algo_collected: readUint64BE(176),
    pending_project_tax: readUint64BE(184),
    buy_tax,
    sell_tax,
    taxes_in_algo,
    total_tax_bps
  };
}
