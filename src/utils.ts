import { Algodv2 } from "algosdk";

export async function compile(algod: Algodv2, source: string): Promise<Uint8Array> {
  const compiled = await algod.compile(source).do();
  return new Uint8Array(Buffer.from(compiled.result, "base64"));
}