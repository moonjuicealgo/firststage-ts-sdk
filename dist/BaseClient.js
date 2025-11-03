import algosdk from "algosdk";
import { compile } from "./utils.js";
export class BaseClient {
    client;
    lpDepositClient;
    algorand;
    from;
    constructor(client, lpDepositClient, algorand, from) {
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
    get algod() {
        return this.algorand.client.algod;
    }
    getApprovalSource(env, overrides) {
        const { approval } = this.client.appSpec.source ?? {};
        if (!approval)
            throw new Error("approval source not found");
        return Buffer.from(approval, "base64").toString();
    }
    getClearSource() {
        const { clear } = this.client.appSpec.source ?? {};
        if (!clear)
            throw new Error("clear source not found");
        return Buffer.from(clear, "base64").toString();
    }
    async compile(env) {
        return Promise.all([
            compile(this.algod, this.getApprovalSource(env)),
            compile(this.algod, this.getClearSource()),
        ]);
    }
    async makeCreateTransactions({ env }) {
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
//# sourceMappingURL=BaseClient.js.map