import algosdk from 'algosdk';

export function getBoxKeyForAsset(assetId: number): Uint8Array {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, 0x61); // 'a'

  const high = Math.floor(assetId / 2 ** 32);
  const low = assetId >>> 0;
  view.setUint32(1, high, false);
  view.setUint32(5, low, false);

  return new Uint8Array(buffer);
}

export function getUserAssetBoxKey(assetId: number, address: string): Uint8Array {
  const assetBytes = new Uint8Array(8);
  new DataView(assetBytes.buffer).setBigUint64(0, BigInt(assetId), false);

  const addrBytes = algosdk.decodeAddress(address).publicKey;
  return new Uint8Array([...assetBytes, ...addrBytes]);
}
