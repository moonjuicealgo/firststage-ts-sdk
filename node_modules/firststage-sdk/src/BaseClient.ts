import algosdk, { Algodv2 } from "algosdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { FirstStageClient } from "./generated/FirstStage.js";
import { LpDepositClient } from './generated/LpDeposit.js';
import { compile } from "./utils.js";

export class BaseClient {
  readonly client: FirstStageClient;
  readonly lpDepositClient: LpDepositClient;
  readonly algorand: AlgorandClient;
  readonly from: string;

  constructor(
    client: FirstStageClient,
    lpDepositClient: LpDepositClient,
    algorand: AlgorandClient,
    from: string
  ) {
    this.client = client;
    this.lpDepositClient = lpDepositClient;
    this.algorand = algorand;
    this.from = from;
  }

  get appId() {
    return this.client.appId;
  }

  get appAddr() {
    return algosdk.getApplicationAddress(this.client.appId);
  }

  get algod(): Algodv2 {
    return this.algorand.client.algod;
  }

  getApprovalSource(env?: string, overrides?: any): string {
    const { approval } = this.client.appSpec.source ?? {};
    if (!approval) throw new Error("approval source not found");
    return Buffer.from(approval, "base64").toString();
  }

  getClearSource(): string {
    const { clear } = this.client.appSpec.source ?? {};
    if (!clear) throw new Error("clear source not found");
    return Buffer.from(clear, "base64").toString();
  }

  async compile(env?: string) {
    return Promise.all([
      compile(this.algod, this.getApprovalSource(env)),
      compile(this.algod, this.getClearSource()),
    ]);
  }

  async makeCreateTransactions({ env }: { env?: string }) {
    const [approvalProgram, clearProgram] = await this.compile(env);
    const suggestedParams = await this.algod.getTransactionParams().do();

    const txn = algosdk.makeApplicationCreateTxnFromObject({
      from: this.from,
      approvalProgram,
      clearProgram,
      suggestedParams,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      ...this.client.appSpec.schema,
    });

    return [txn];
  }
}
