import algosdk, { Algodv2 } from "algosdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { FirstStageClient } from "./generated/FirstStage.js";
import { LpDepositClient } from './generated/LpDeposit.js';
export declare class BaseClient {
    readonly client: FirstStageClient;
    readonly lpDepositClient: LpDepositClient;
    readonly algorand: AlgorandClient;
    readonly from: string;
    constructor(client: FirstStageClient, lpDepositClient: LpDepositClient, algorand: AlgorandClient, from: string);
    get appId(): any;
    get appAddr(): algosdk.Address;
    get algod(): Algodv2;
    getApprovalSource(env?: string, overrides?: any): string;
    getClearSource(): string;
    compile(env?: string): Promise<[Uint8Array<ArrayBufferLike>, Uint8Array<ArrayBufferLike>]>;
    makeCreateTransactions({ env }: {
        env?: string;
    }): Promise<algosdk.Transaction[]>;
}
//# sourceMappingURL=BaseClient.d.ts.map