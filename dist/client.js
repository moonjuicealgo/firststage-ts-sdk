import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";
import { getBoxKeyForAsset, getUserAssetBoxKey } from "./boxes.js";
import { decodeAssetBox, decodeUserDepositBox } from "./decoders.js";
import { FirstStageClient } from "./generated/FirstStage.js";
import { BaseClient } from "./BaseClient.js";
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount";
import { LpDepositClient } from "./generated/LpDeposit.js";
import { FirstStageDeflexTransaction } from "./index.js";
import { PeraSwap } from "@perawallet/swap";
const DEFAULT_APP_IDS = {
    testnet: 743789179,
    mainnet: 3158291365,
};
const DEFAULT_LP_APP_IDS = {
    testnet: 743764650n,
    mainnet: 3155594055n,
};
export class FirstStageSDK {
    algod;
    algodConfig;
    appId;
    algorandClient;
    baseClient;
    fsClient;
    lpClient;
    network;
    get clientParams() {
        return this.fsClient?.params;
    }
    get clientAppId() {
        return this.fsClient?.appId;
    }
    constructor(network = "testnet", algodConfig) {
        this.network = network;
        this.appId = DEFAULT_APP_IDS[network];
        const server = network === "mainnet"
            ? "https://mainnet-api.algonode.cloud"
            : "https://testnet-api.algonode.cloud";
        this.algod = algodConfig
            ? new algosdk.Algodv2(algodConfig.token, algodConfig.server, algodConfig.port)
            : new algosdk.Algodv2("", server, "");
        this.algodConfig = {
            token: algodConfig?.token ?? "",
            server: algodConfig?.server ?? server,
            port: algodConfig?.port ?? "",
        };
        this.algod = new algosdk.Algodv2(this.algodConfig.token, this.algodConfig.server, this.algodConfig.port);
        this.algorandClient = AlgorandClient.fromConfig({
            algodConfig: {
                token: algodConfig?.token ?? "",
                server: algodConfig?.server ?? server,
                port: algodConfig?.port ?? "",
            },
        });
        this.fsClient = new FirstStageClient({
            appId: this.appId,
            algorand: this.algorandClient,
            defaultSigner: algosdk.makeEmptyTransactionSigner(),
        });
        this.lpClient = new LpDepositClient({
            appId: DEFAULT_LP_APP_IDS[network],
            algorand: this.algorandClient,
            defaultSigner: algosdk.makeEmptyTransactionSigner(),
        });
    }
    getAlgod() {
        return this.algod;
    }
    async getAssetInformation(assetId) {
        try {
            const key = getBoxKeyForAsset(assetId);
            const res = await this.algod.getApplicationBoxByName(this.appId, key).do();
            return decodeAssetBox(new Uint8Array(res.value));
        }
        catch (err) {
            if (err?.message?.includes("box not found") || err?.statusCode === 404) {
                return null;
            }
            console.error(`Error fetching asset box: ${err}`);
            return null;
        }
    }
    async listFirstStageAssets() {
        const mainAppAddress = algosdk.getApplicationAddress(this.appId);
        const accountInfo = await this.algod.accountInformation(mainAppAddress).do();
        const assetIds = (accountInfo.assets ?? []).map((a) => Number(a['assetId']));
        const result = [];
        for (const id of assetIds) {
            const info = await this.getAssetInformation(id);
            if (info) {
                result.push({ assetId: id, info });
            }
        }
        return result;
    }
    async getUserInformation(assetId, userAddress) {
        try {
            const key = getUserAssetBoxKey(assetId, userAddress);
            const res = await this.algod.getApplicationBoxByName(this.appId, key).do();
            return new Uint8Array(res.value);
        }
        catch {
            return null;
        }
    }
    async isFreezeEligible(address, assetId) {
        const exemptResult = await this.fsClient.checkIsAddressExempt({
            sender: address,
            args: [address, BigInt(assetId)]
        });
        if (exemptResult === true) {
            return false;
        }
        const maybeExemptAppResult = await this.fsClient.checkIsAddressMaybeExemptApp({
            sender: address,
            args: [address, BigInt(assetId)]
        });
        if (maybeExemptAppResult === true) {
            return false;
        }
        return true;
    }
    async getUserAssetInfo(assetId, userAddress) {
        try {
            const userBox = await this.getUserInformation(assetId, userAddress);
            if (!userBox)
                return null;
            const view = new DataView(userBox.buffer);
            const readUint64BE = (offset) => {
                const high = view.getUint32(offset, false);
                const low = view.getUint32(offset + 4, false);
                return BigInt(high) * BigInt(2 ** 32) + BigInt(low);
            };
            const claimable_freeze_rewards = readUint64BE(32);
            const registered_balance = readUint64BE(40);
            this.baseClient = new BaseClient(this.fsClient, this.lpClient, this.algorandClient, userAddress);
            const [pending_reflections_tokens, pending_reflections_algo] = await this.baseClient.client.getReflectionPreview({
                sender: userAddress,
                args: [BigInt(assetId), userAddress],
            });
            return {
                claimable_freeze_rewards,
                registered_balance,
                pending_reflections_tokens,
                pending_reflections_algo,
            };
        }
        catch (err) {
            console.error(`Failed to fetch user asset info: ${err}`);
            return null;
        }
    }
    async fetchDeflexQuoteWithTax({ userAddress, fromAssetId, toAssetId, amount, type = "fixed-input", disabledProtocols = [], feeBps, deflexReferrerAddress, network = "mainnet", deflexApiUrl, deflexApiKey, algodToken, algodServer, algodPort, slippage = 0.005, maxGroupSize = 16, }) {
        const fromAssetInfo = await this.getAssetInformation(fromAssetId);
        const toAssetInfo = await this.getAssetInformation(toAssetId);
        let taxedAmount = amount;
        let minReceived;
        if (type === "fixed-input" && fromAssetInfo?.sell_tax && fromAssetInfo.total_tax_bps) {
            taxedAmount = Math.floor(amount * (1 - Number(fromAssetInfo.total_tax_bps) / 10_000));
        }
        // ✅ Only apply buy-tax adjustment when fixed-output
        if (type === "fixed-output" && toAssetInfo?.buy_tax && toAssetInfo.total_tax_bps) {
            minReceived = Math.floor(amount * (1 - Number(toAssetInfo.total_tax_bps) / 10_000));
        }
        let needsOptIn = false;
        if (userAddress) {
            try {
                // Only check Deflex opt-in for non-ALGO, non-taxed assets
                const isTaxed = Boolean(toAssetInfo?.buy_tax || toAssetInfo?.sell_tax);
                if (toAssetId !== 0 && !isTaxed) {
                    try {
                        const info = await this.algod.accountAssetInformation(userAddress, toAssetId).do();
                        if (!info || !info["assetHolding"]) {
                            needsOptIn = true;
                        }
                    }
                    catch (err) {
                        // 404 = user not opted in yet
                        if (err?.response?.status === 404) {
                            needsOptIn = true;
                        }
                        else {
                            console.warn("⚠️ Opt-in check failed, assuming opted-in:", err);
                        }
                    }
                }
            }
            catch (outerErr) {
                console.warn("⚠️ Unexpected error checking opt-in:", outerErr);
            }
        }
        let groupSize;
        if (fromAssetInfo && toAssetInfo) {
            groupSize = 10;
        }
        else if (fromAssetInfo || toAssetInfo) {
            groupSize = 13;
        }
        else {
            groupSize = maxGroupSize;
        }
        const server = algodServer ?? this.algodConfig.server;
        const token = algodToken ?? this.algodConfig.token;
        const port = algodPort ?? this.algodConfig.port;
        const baseUrl = deflexApiUrl ?? process.env.EXPO_PUBLIC_DEFLEX_API_URL ?? "https://deflex.txnlab.dev";
        const url = new URL(`${baseUrl}/api/fetchQuote`);
        url.searchParams.append("chain", network);
        url.searchParams.append("algodUri", server);
        url.searchParams.append("algodToken", token);
        url.searchParams.append("algodPort", port.toString());
        url.searchParams.append("fromASAID", fromAssetId.toString());
        url.searchParams.append("toASAID", toAssetId.toString());
        url.searchParams.append("amount", taxedAmount.toString());
        url.searchParams.append("type", type);
        url.searchParams.append("atomicOnly", "true");
        url.searchParams.append("disabledProtocols", disabledProtocols.join(","));
        url.searchParams.append("slippage", slippage.toString());
        url.searchParams.append("maxGroupSize", groupSize.toString());
        url.searchParams.append("optIn", needsOptIn ? "true" : "false");
        const key = deflexApiKey ?? process.env.EXPO_PUBLIC_DEFLEX_API_KEY;
        if (key)
            url.searchParams.append("apiKey", key);
        if (feeBps !== undefined)
            url.searchParams.append("feeBps", feeBps.toString());
        if (deflexReferrerAddress)
            url.searchParams.append("referrerAddress", deflexReferrerAddress);
        if (minReceived !== undefined)
            url.searchParams.append("minReceived", minReceived.toString());
        const response = await fetch(url.toString());
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch Deflex quote: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const quote = (await response.json());
        if (fromAssetInfo?.sell_tax && fromAssetInfo.total_tax_bps) {
            const taxRate = Number(fromAssetInfo.total_tax_bps) / 10_000;
            if (quote.usdIn)
                quote.usdIn /= 1 - taxRate;
        }
        if (toAssetInfo?.buy_tax && toAssetInfo.total_tax_bps && type === "fixed-input") {
            const buyTaxRate = Number(toAssetInfo.total_tax_bps) / 10_000;
            if (quote.usdOut)
                quote.usdOut /= 1 - buyTaxRate;
        }
        return quote;
    }
    /**
     * Checks whether a user’s asset holding is currently frozen.
     * Returns true if the asset is frozen for the given address.
     */
    async isFrozen(userAddress, assetId) {
        try {
            // Query Algorand node for asset info for this account
            const accountInfo = await this.algod.accountAssetInformation(userAddress, assetId).do();
            // Algorand API returns a structure like:
            // { "asset-holding": { amount: ..., "is-frozen": true/false } }
            const frozen = accountInfo["assetHolding"]?.["isFrozen"];
            // If the field exists and is true → user is frozen
            return Boolean(frozen);
        }
        catch (err) {
            // If the account doesn’t hold the asset yet, it won’t be frozen
            if (err?.response?.status === 404)
                return false;
            console.error(`Error checking freeze status for ${assetId} on ${userAddress}:`, err);
            throw new Error(`Failed to check freeze status for asset ${assetId}`);
        }
    }
    async generateGeneralOpsGroup(userAddress, assetIds, userTxns, referralAddress, defaultSigner) {
        const suggestedParams = await this.algod.getTransactionParams().do();
        const composer = this.fsClient.algorand.newGroup();
        const fallbackSigner = defaultSigner ?? algosdk.makeEmptyTransactionSigner();
        const signerAccount = { addr: userAddress, signer: fallbackSigner };
        // Grouped txns
        const freezeTxns = [];
        const topCalls = [];
        const bottomCalls = [];
        const optIns = [];
        for (const assetId of assetIds) {
            const assetInfo = await FirstStageSDK.fetchAssetInfo(assetId, this.network);
            if (!assetInfo)
                throw new Error(`Asset info not found for asset ${assetId}`);
            const totalTaxBps = assetInfo.total_tax_bps ?? 0;
            const userInfo = await this.getUserAssetInfo(assetId, userAddress);
            const initialBalance = userInfo?.registered_balance ?? 0n;
            let netChange = 0n;
            for (const { txn } of userTxns) {
                if (txn.type === "axfer") {
                    const axfer = txn;
                    const txAssetId = BigInt(axfer.assetTransfer?.assetIndex ?? 0n);
                    const amt = BigInt(axfer.assetTransfer?.amount ?? 0n);
                    if (txAssetId === BigInt(assetId)) {
                        if (axfer.sender?.toString() === userAddress)
                            netChange -= amt;
                        if (axfer.assetTransfer?.receiver?.toString() === userAddress)
                            netChange += amt;
                    }
                }
            }
            function computeContractTax(amountTransferred, totalTaxBps) {
                return (amountTransferred * totalTaxBps + (10000n - totalTaxBps) - 1n) / (10000n - totalTaxBps);
            }
            const absChange = netChange < 0n ? -netChange : netChange;
            const taxAmount = computeContractTax(absChange, BigInt(totalTaxBps));
            if (assetId !== 0) { // skip ALGO
                let optedIn = false;
                try {
                    const info = await this.algod.accountAssetInformation(userAddress, assetId).do();
                    optedIn = Boolean(info && info["assetHolding"]);
                }
                catch (err) {
                    if (err?.response?.status === 404) {
                        optedIn = false; // user is NOT opted in
                    }
                    else {
                        console.warn("⚠️ Opt-in check failed, assuming opted-in:", err);
                        optedIn = true;
                    }
                }
                if (!optedIn) {
                    const optInTxn = await this.fsClient.algorand.createTransaction.assetOptIn({
                        sender: userAddress,
                        assetId: BigInt(assetId),
                        firstValidRound: suggestedParams.firstValid,
                        lastValidRound: suggestedParams.lastValid,
                    });
                    optIns.push({ txn: optInTxn, signer: signerAccount.signer });
                }
            }
            const freezeEligible = await this.isFreezeEligible(userAddress, assetId);
            const isCurrentlyFrozen = await this.isFrozen(userAddress, assetId);
            if (!freezeEligible) {
                console.log(`User is NOT freeze eligible for asset ${assetId} — skipping.`);
                continue; // skip asset entirely
            }
            if (!isCurrentlyFrozen && freezeEligible) {
                const mbrTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                    sender: userAddress,
                    receiver: this.fsClient.appAddress,
                    amount: 37_700, // MBR minimum, adjust as needed
                    suggestedParams,
                });
                const freezeTxn = await this.fsClient.params.freeze({
                    sender: userAddress,
                    args: [BigInt(assetId), userAddress, { txn: mbrTxn, signer: signerAccount.signer }],
                    signer: signerAccount.signer,
                    extraFee: AlgoAmount.MicroAlgos(2000),
                    firstValidRound: suggestedParams.firstValid,
                    lastValidRound: suggestedParams.lastValid,
                });
                topCalls.push(freezeTxn);
            }
            const topCall = await this.fsClient.params.generalOperationsTop({
                sender: userAddress,
                args: [1n, BigInt(assetId), initialBalance],
                signer: signerAccount.signer,
                extraFee: AlgoAmount.MicroAlgos(2000),
                firstValidRound: suggestedParams.firstValid,
                lastValidRound: suggestedParams.lastValid,
            });
            topCalls.push(topCall);
            const taxTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                sender: userAddress,
                receiver: this.fsClient.appAddress,
                assetIndex: assetId,
                amount: taxAmount,
                suggestedParams,
            });
            const bottomCall = await this.fsClient.params.generalOperationsBottom({
                sender: userAddress,
                args: [2n, BigInt(assetId), { txn: taxTxn, signer: signerAccount.signer }, referralAddress],
                signer: signerAccount.signer,
                extraFee: AlgoAmount.MicroAlgos(11000),
                firstValidRound: suggestedParams.firstValid,
                lastValidRound: suggestedParams.lastValid,
            });
            bottomCalls.push(bottomCall);
        }
        console.log(`Freeze txns: ${freezeTxns.length}, top calls: ${topCalls.length}, swaps: ${userTxns.length}, bottom calls: ${bottomCalls.length}`);
        for (const { txn, signer } of optIns) {
            composer.addTransaction(txn, signer);
        }
        ;
        for (const top of topCalls)
            composer.addAppCallMethodCall(top);
        for (const { txn, signer } of userTxns)
            composer.addTransaction(txn, signer ?? signerAccount.signer);
        for (const bottom of bottomCalls)
            composer.addAppCallMethodCall(bottom);
        return composer;
    }
    async wrapDeflexSwapGroup(apiResponse, userAddress, referralAddress, fromAssetId, toAssetId, slippage = 0.005, defaultSigner) {
        // Use the same parsing logic as generateDeflexSwapGroup
        const deflexTxns = apiResponse.txns.map((t) => FirstStageDeflexTransaction.fromApiResponse(t));
        const processedTxns = [];
        for (const deflexTxn of deflexTxns) {
            const txnBytes = Buffer.from(deflexTxn.data, 'base64');
            const transaction = algosdk.decodeUnsignedTransaction(txnBytes);
            const originalGroupId = transaction.group;
            delete transaction.group;
            if (deflexTxn.signature !== false) {
                processedTxns.push({
                    txn: transaction,
                    needsUserSignature: false,
                    deflexSignature: deflexTxn.signature,
                    originalGroupId: originalGroupId ?? new Uint8Array(),
                });
            }
            else {
                processedTxns.push({
                    txn: transaction,
                    needsUserSignature: true,
                    originalGroupId: originalGroupId ?? new Uint8Array(),
                });
            }
        }
        async function reSignTransaction(transaction, signature) {
            try {
                if (signature.type === 'logic_signature') {
                    const decoded = algosdk.msgpackRawDecode(signature.value);
                    if (!decoded.lsig)
                        throw new Error('Logic signature structure missing lsig field');
                    const lsig = decoded.lsig;
                    const logicSigAccount = new algosdk.LogicSigAccount(lsig.l, lsig.arg);
                    const signedTxn = algosdk.signLogicSigTransactionObject(transaction, logicSigAccount);
                    return signedTxn.blob;
                }
                else if (signature.type === 'secret_key') {
                    const signResult = algosdk.signTransaction(transaction, signature.value);
                    return signResult.blob;
                }
                else {
                    throw new Error(`Unsupported signature type: ${signature.type}`);
                }
            }
            catch (error) {
                console.error(`Error re-signing transaction:`, error);
                throw error;
            }
        }
        function makeDeflexTransactionSigner(deflexSignature) {
            return async (txnGroup, indexesToSign) => {
                const signedTxns = [];
                for (const idx of indexesToSign) {
                    const txn = txnGroup[idx];
                    if (!txn)
                        throw new Error(`Transaction at index ${idx} is undefined`);
                    const signedTxnBlob = await reSignTransaction(txn, deflexSignature);
                    signedTxns.push(signedTxnBlob);
                }
                return signedTxns;
            };
        }
        const userTxns = processedTxns.map((proc) => {
            if (proc.needsUserSignature) {
                return { txn: proc.txn, signer: defaultSigner };
            }
            else if (proc.deflexSignature) {
                return {
                    txn: proc.txn,
                    signer: makeDeflexTransactionSigner(proc.deflexSignature),
                };
            }
            else {
                return { txn: proc.txn, signer: algosdk.makeEmptyTransactionSigner() };
            }
        });
        const assetIds = [];
        for (const id of [fromAssetId, toAssetId]) {
            const assetInfo = await FirstStageSDK.fetchAssetInfo(id, 'mainnet');
            if (assetInfo && (await this.isFreezeEligible(userAddress, id))) {
                assetIds.push(id);
            }
        }
        let composer;
        if (assetIds.length > 0) {
            composer = await this.generateGeneralOpsGroup(userAddress, assetIds, userTxns, referralAddress, defaultSigner);
        }
        else {
            composer = this.fsClient.algorand.newGroup();
            for (const { txn, signer } of userTxns) {
                composer.addTransaction(txn, signer);
            }
        }
        return composer;
    }
    async generateDeflexSwapGroup(quotePayload, userAddress, referralAddress, fromAssetId, toAssetId, slippage = 0.005, defaultSigner, apiKey) {
        const executionResponse = await fetch("https://deflex.txnlab.dev/api/fetchExecuteSwapTxns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                address: userAddress,
                txnPayloadJSON: quotePayload,
                slippage,
                apiKey: apiKey ?? process.env.EXPO_PUBLIC_DEFLEX_API_KEY,
            }),
        });
        if (!executionResponse.ok) {
            throw new Error(`fetchExecuteSwapTxns failed: ${executionResponse.statusText}`);
        }
        const apiResponse = await executionResponse.json();
        const deflexTxns = apiResponse.txns.map((t) => FirstStageDeflexTransaction.fromApiResponse(t));
        const processedTxns = [];
        for (const deflexTxn of deflexTxns) {
            const txnBytes = Buffer.from(deflexTxn.data, "base64");
            const transaction = algosdk.decodeUnsignedTransaction(txnBytes);
            const originalGroupId = transaction.group;
            delete transaction.group;
            if (deflexTxn.signature !== false) {
                processedTxns.push({
                    txn: transaction,
                    needsUserSignature: false,
                    deflexSignature: deflexTxn.signature,
                    originalGroupId: originalGroupId ?? new Uint8Array(),
                });
            }
            else {
                processedTxns.push({
                    txn: transaction,
                    needsUserSignature: true,
                    originalGroupId: originalGroupId ?? new Uint8Array(),
                });
            }
        }
        async function reSignTransaction(transaction, signature) {
            try {
                if (signature.type === 'logic_signature') {
                    const decoded = algosdk.msgpackRawDecode(signature.value);
                    if (!decoded.lsig) {
                        throw new Error('Logic signature structure missing lsig field');
                    }
                    const lsig = decoded.lsig;
                    const logicSigAccount = new algosdk.LogicSigAccount(lsig.l, lsig.arg);
                    const signedTxn = algosdk.signLogicSigTransactionObject(transaction, logicSigAccount);
                    return signedTxn.blob;
                }
                else if (signature.type === 'secret_key') {
                    const signResult = algosdk.signTransaction(transaction, signature.value);
                    return signResult.blob;
                }
                else {
                    throw new Error(`Unsupported signature type: ${signature.type}`);
                }
            }
            catch (error) {
                console.error(`Error re-signing transaction:`, error);
                throw error;
            }
        }
        function makeDeflexTransactionSigner(deflexSignature) {
            return async (txnGroup, indexesToSign) => {
                const signedTxns = [];
                for (const idx of indexesToSign) {
                    const txn = txnGroup[idx];
                    if (!txn) {
                        throw new Error(`Transaction at index ${idx} is undefined`);
                    }
                    const signedTxnBlob = await reSignTransaction(txn, deflexSignature);
                    signedTxns.push(signedTxnBlob);
                }
                return signedTxns;
            };
        }
        const userTxns = processedTxns.map((proc) => {
            if (proc.needsUserSignature) {
                return { txn: proc.txn, signer: defaultSigner };
            }
            else if (proc.deflexSignature) {
                return {
                    txn: proc.txn,
                    signer: makeDeflexTransactionSigner(proc.deflexSignature)
                };
            }
            else {
                return { txn: proc.txn, signer: algosdk.makeEmptyTransactionSigner() };
            }
        });
        const assetIds = [];
        for (const id of [fromAssetId, toAssetId]) {
            const assetInfo = await FirstStageSDK.fetchAssetInfo(id, "mainnet");
            if (assetInfo && await this.isFreezeEligible(userAddress, id)) {
                assetIds.push(id);
            }
        }
        let composer;
        if (assetIds.length > 0) {
            composer = await this.generateGeneralOpsGroup(userAddress, assetIds, userTxns, referralAddress, defaultSigner);
        }
        else {
            composer = this.fsClient.algorand.newGroup();
            for (const { txn, signer } of userTxns) {
                composer.addTransaction(txn, signer);
            }
        }
        return composer;
    }
    async fetchPeraQuoteWithTax({ fromAssetId, toAssetId, amount, userAddress, slippage = 0.005, providers = ["tinyman", "vestige-v4"], // default values
     }) {
        const peraSwap = new PeraSwap(this.network);
        const fromAssetInfo = await this.getAssetInformation(fromAssetId);
        const toAssetInfo = await this.getAssetInformation(toAssetId);
        let taxedAmount = amount;
        let minReceived;
        if (fromAssetInfo?.sell_tax && fromAssetInfo.total_tax_bps) {
            taxedAmount = Math.floor(amount * (1 - Number(fromAssetInfo.total_tax_bps) / 10_000));
        }
        if (toAssetInfo?.buy_tax && toAssetInfo.total_tax_bps) {
            minReceived = Math.floor(amount * (1 - Number(toAssetInfo.total_tax_bps) / 10_000));
        }
        const quote = await peraSwap.createQuote({
            providers,
            swapper_address: userAddress,
            swap_type: "fixed-input",
            asset_in_id: fromAssetId,
            asset_out_id: toAssetId,
            amount: taxedAmount.toString(),
            slippage: slippage.toString(),
        });
        if (!quote?.results?.length) {
            throw new Error("No Pera swap quotes found");
        }
        const best = quote.results[0];
        return {
            ...best,
            taxedAmount,
            minReceived,
            fromAssetInfo,
            toAssetInfo,
        };
    }
    async generatePeraSwapGroup(userAddress, fromAssetId, toAssetId, amount, referralAddress, slippage = 0.005, providers = ["tinyman", "vestige-v4"], defaultSigner, quoteIdStr) {
        const peraSwap = new PeraSwap(this.network);
        // --- Fetch asset info & apply taxes ---
        const fromAssetInfo = await this.getAssetInformation(fromAssetId);
        const toAssetInfo = await this.getAssetInformation(toAssetId);
        let taxedAmount = amount;
        if (fromAssetInfo?.sell_tax && fromAssetInfo.total_tax_bps) {
            taxedAmount = Math.floor(amount * (1 - Number(fromAssetInfo.total_tax_bps) / 10_000));
        }
        // --- Determine quote ID (reuse if provided) ---
        let finalQuoteId;
        if (quoteIdStr) {
            finalQuoteId = quoteIdStr;
        }
        else {
            const quoteResponse = await peraSwap.createQuote({
                providers,
                swapper_address: userAddress,
                swap_type: "fixed-input",
                asset_in_id: fromAssetId,
                asset_out_id: toAssetId,
                amount: taxedAmount.toString(),
                slippage: slippage.toString(),
            });
            if (!quoteResponse.results?.length)
                throw new Error("No Pera swap quotes found");
            finalQuoteId = quoteResponse.results[0].quote_id_str;
        }
        // --- Prepare transactions ---
        const prepared = await peraSwap.prepareTransactions(finalQuoteId);
        // --- Collect user + pre-signed txns ---
        const userTxns = [];
        for (const group of prepared.transaction_groups) {
            for (let i = 0; i < group.transactions.length; i++) {
                const unsignedB64 = group.transactions[i];
                const signedB64 = group.signed_transactions?.[i];
                if (signedB64) {
                    // Pera already signed this transaction (logic-sig, escrow, etc.)
                    const signedBlob = Buffer.from(signedB64, "base64");
                    const decoded = algosdk.decodeSignedTransaction(signedBlob);
                    userTxns.push({
                        txn: decoded.txn,
                        signer: async () => [signedBlob], // return the signed blob directly
                    });
                }
                else if (unsignedB64) {
                    // Unsigned txn -> user must sign
                    const unsignedBlob = Buffer.from(unsignedB64, "base64");
                    const txn = algosdk.decodeUnsignedTransaction(unsignedBlob);
                    const signer = defaultSigner ?? algosdk.makeEmptyTransactionSigner();
                    userTxns.push({ txn, signer });
                }
                else {
                    throw new Error(`Transaction missing at index ${i} in prepared group`);
                }
            }
        }
        // --- Freeze eligibility checks (for taxes) ---
        const assetIds = [];
        for (const id of [fromAssetId, toAssetId]) {
            const assetInfo = await FirstStageSDK.fetchAssetInfo(id, "mainnet");
            if (assetInfo && (await this.isFreezeEligible(userAddress, id))) {
                assetIds.push(id);
            }
        }
        // --- Generate final composer ---
        const composer = await this.generateGeneralOpsGroup(userAddress, assetIds, userTxns, referralAddress, defaultSigner);
        return composer;
    }
    async generateAddLiquidityGroup(userAddress, assetIds, lpAssetId, lpAppId, userTxns, depositAmounts, defaultSigner) {
        const suggestedParams = await this.algod.getTransactionParams().do();
        const composer = this.fsClient.algorand.newGroup();
        const fallbackSigner = defaultSigner ?? algosdk.makeEmptyTransactionSigner();
        const signerAccount = { addr: userAddress, signer: fallbackSigner };
        // --- Check if LP deposit box already exists ---
        const existingDeposit = await this.getUserDeposit(userAddress, lpAssetId);
        const mbrAmount = existingDeposit?.lp_deposit && existingDeposit.lp_deposit > 0n ? 0 : 37_700;
        for (const assetId of assetIds) {
            const userBox = await this.getUserInformation(assetId, userAddress);
            const freezeEligible = await this.isFreezeEligible(userAddress, assetId);
            if (!userBox && freezeEligible) {
                const acctInfo = await this.algod.accountInformation(userAddress).do();
                const balance = (aid) => {
                    if (aid === 0)
                        return BigInt(acctInfo.amount);
                    const asset = acctInfo.assets?.find((a) => a["asset-id"] === aid);
                    return asset ? BigInt(asset.amount) : 0n;
                };
                const topCall = await this.fsClient.params.liquidityTop({
                    sender: userAddress,
                    signer: signerAccount.signer,
                    args: [
                        7n,
                        BigInt(assetId),
                        BigInt(lpAssetId),
                        balance(assetId),
                        balance(lpAssetId),
                    ],
                    extraFee: AlgoAmount.MicroAlgos(3000),
                });
                composer.addAppCallMethodCall(topCall);
            }
        }
        for (const { txn, signer } of userTxns) {
            const txSigner = signer ? { addr: userAddress, signer } : signerAccount;
            composer.addTransaction(txn, txSigner.signer);
        }
        const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: userAddress,
            receiver: this.lpClient.appAddress,
            amount: mbrAmount,
            suggestedParams,
        });
        if (assetIds.length === 1) {
            const assetId = assetIds[0];
            const amount = depositAmounts.get(assetId);
            if (amount === undefined)
                throw new Error(`Missing deposit amount for ${assetId}`);
            const depositTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                sender: userAddress,
                receiver: this.lpClient.appAddress,
                assetIndex: assetId,
                amount,
                suggestedParams,
            });
            const depositCall = await this.lpClient.params.lpDeposit({
                sender: userAddress,
                signer: signerAccount.signer,
                args: [
                    BigInt(assetId),
                    BigInt(lpAssetId),
                    BigInt(lpAppId),
                    depositTxn,
                    paymentTxn,
                ],
                extraFee: AlgoAmount.MicroAlgos(9000),
            });
            composer.addAppCallMethodCall(depositCall);
        }
        else if (assetIds.length === 2) {
            const a1 = assetIds[0];
            const a2 = assetIds[1];
            const amt1 = depositAmounts.get(a1);
            const amt2 = depositAmounts.get(a2);
            if (amt1 === undefined || amt2 === undefined) {
                throw new Error(`Missing deposit amounts for ${a1} or ${a2}`);
            }
            const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                sender: userAddress,
                receiver: this.lpClient.appAddress,
                assetIndex: a1,
                amount: amt1,
                suggestedParams,
            });
            const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                sender: userAddress,
                receiver: this.lpClient.appAddress,
                assetIndex: a2,
                amount: amt2,
                suggestedParams,
            });
            const dualCall = await this.lpClient.params.dualLpDeposit({
                sender: userAddress,
                signer: signerAccount.signer,
                args: [
                    BigInt(a1),
                    BigInt(a2),
                    BigInt(lpAssetId),
                    BigInt(lpAppId),
                    txn1,
                    txn2,
                    paymentTxn,
                ],
                extraFee: AlgoAmount.MicroAlgos(3000),
            });
            composer.addAppCallMethodCall(dualCall);
        }
        for (const assetId of assetIds) {
            const userBox = await this.getUserInformation(assetId, userAddress);
            const freezeEligible = await this.isFreezeEligible(userAddress, assetId);
            if (!userBox && freezeEligible) {
                const bottomCall = await this.fsClient.params.liquidityBottom({
                    sender: userAddress,
                    signer: signerAccount.signer,
                    args: [8n, BigInt(assetId)],
                    extraFee: AlgoAmount.MicroAlgos(3000),
                });
                composer.addAppCallMethodCall(bottomCall);
            }
        }
        return composer;
    }
    async generateRemoveLiquidityGroup(userAddress, assetIds, lpAssetId, userTxns, defaultSigner) {
        const suggestedParams = await this.algod.getTransactionParams().do();
        const composer = this.fsClient.algorand.newGroup();
        const fallbackSigner = defaultSigner ?? algosdk.makeEmptyTransactionSigner();
        const signerAccount = { addr: userAddress, signer: fallbackSigner };
        for (const assetId of assetIds) {
            const userBox = await this.getUserInformation(assetId, userAddress);
            const freezeEligible = await this.isFreezeEligible(userAddress, assetId);
            if (!userBox && freezeEligible) {
                const acctInfo = await this.algod.accountInformation(userAddress).do();
                const balance = (aid) => {
                    if (aid === 0)
                        return BigInt(acctInfo.amount);
                    const asset = acctInfo.assets?.find((a) => a["asset-id"] === aid);
                    return asset ? BigInt(asset.amount) : 0n;
                };
                const topCall = await this.fsClient.params.liquidityTop({
                    sender: userAddress,
                    signer: signerAccount.signer,
                    args: [
                        9n,
                        BigInt(assetId),
                        BigInt(lpAssetId),
                        balance(assetId),
                        balance(lpAssetId),
                    ],
                    extraFee: AlgoAmount.MicroAlgos(3000),
                });
                composer.addAppCallMethodCall(topCall);
            }
        }
        for (const { txn, signer } of userTxns) {
            const txSigner = signer ? { addr: userAddress, signer } : signerAccount;
            composer.addTransaction(txn, txSigner.signer);
        }
        const assetId = assetIds[0];
        const withdrawCall = await this.lpClient.params.lpWithdraw({
            sender: userAddress,
            signer: signerAccount.signer,
            args: [
                BigInt(assetId),
                BigInt(lpAssetId),
            ],
            extraFee: AlgoAmount.MicroAlgos(3000),
        });
        composer.addAppCallMethodCall(withdrawCall);
        for (const assetId of assetIds) {
            const userBox = await this.getUserInformation(assetId, userAddress);
            const freezeEligible = await this.isFreezeEligible(userAddress, assetId);
            if (!userBox && freezeEligible) {
                const bottomCall = await this.fsClient.params.liquidityBottom({
                    sender: userAddress,
                    signer: signerAccount.signer,
                    args: [10n, BigInt(assetId)],
                    extraFee: AlgoAmount.MicroAlgos(3000),
                });
                composer.addAppCallMethodCall(bottomCall);
            }
        }
        return composer;
    }
    async getUserDeposit(userAddress, lpAssetId) {
        try {
            const addrBytes = algosdk.decodeAddress(userAddress).publicKey;
            const assetBytes = new Uint8Array(8);
            new DataView(assetBytes.buffer).setBigUint64(0, BigInt(lpAssetId), false);
            const boxKey = new Uint8Array(addrBytes.length + assetBytes.length);
            boxKey.set(addrBytes, 0);
            boxKey.set(assetBytes, addrBytes.length);
            const box = await this.algod.getApplicationBoxByName(this.lpClient.appId, boxKey).do();
            if (!box?.value)
                throw new Error("Box not found");
            return decodeUserDepositBox(new Uint8Array(box.value));
        }
        catch (err) {
            console.warn(`User deposit box not found for ${userAddress}, lpAssetId ${lpAssetId}:`, err);
            return {
                locked_asset_id: 0n,
                lp_deposit: 0n,
                locked_lp_tokens: 0n,
                lp_app_id: 0n,
                second_locked_asset_id: 0n,
                second_lp_deposit: 0n,
            };
        }
    }
    async generateFreezeTxnGroup(userAddress, assetId, refreezeAddress, signer) {
        const isExempt = await this.fsClient.checkIsAddressExempt({
            sender: userAddress,
            args: [refreezeAddress, BigInt(assetId)],
        });
        if (isExempt) {
            console.log(`User ${refreezeAddress} IS on whitelist (exempt) → cannot be frozen for asset ${assetId}.`);
            return null;
        }
        console.log(`User ${userAddress} is NOT exempt → freeze-eligible candidate for asset ${assetId}.`);
        const composer = this.fsClient.algorand.newGroup();
        const defaultSigner = signer ?? algosdk.makeEmptyTransactionSigner();
        let isMaybeExempt = false;
        try {
            isMaybeExempt = await this.fsClient.checkIsAddressMaybeExemptApp({
                sender: userAddress,
                args: [refreezeAddress, BigInt(assetId)],
            });
        }
        catch {
            isMaybeExempt = false;
        }
        const paymentAmount = isMaybeExempt ? 10_000_000 : 37_700;
        console.log(`Payment amount determined: ${paymentAmount} microAlgos (maybeExempt=${isMaybeExempt})`);
        const suggestedParams = await this.algod.getTransactionParams().do();
        const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: userAddress,
            receiver: this.fsClient.appAddress,
            amount: paymentAmount,
            suggestedParams,
        });
        const freezeMethod = this.fsClient.params.freeze;
        const args = [
            BigInt(assetId),
            refreezeAddress ?? "",
            { txn: paymentTxn, signer: defaultSigner },
        ];
        const freezeTxn = await freezeMethod({
            sender: userAddress,
            signer: defaultSigner,
            onComplete: algosdk.OnApplicationComplete.NoOpOC,
            args,
            extraFee: AlgoAmount.MicroAlgos(3000),
        });
        composer.addAppCallMethodCall(freezeTxn);
        return composer;
    }
    static async fetchAssetInfo(assetId, network = "testnet", algodConfig) {
        const applicationId = DEFAULT_APP_IDS[network];
        const server = network === "mainnet"
            ? "https://mainnet-api.algonode.cloud"
            : "https://testnet-api.algonode.cloud";
        const algod = algodConfig
            ? new algosdk.Algodv2(algodConfig.token, algodConfig.server, algodConfig.port)
            : new algosdk.Algodv2("", server, "");
        try {
            const key = getBoxKeyForAsset(assetId);
            const res = await algod.getApplicationBoxByName(applicationId, key).do();
            return decodeAssetBox(new Uint8Array(res.value));
        }
        catch (err) {
            console.warn(`Could not fetch asset info for assetId=${assetId}: ${err}`);
            return null;
        }
    }
}
//# sourceMappingURL=client.js.map