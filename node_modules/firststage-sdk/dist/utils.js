export async function compile(algod, source) {
    const compiled = await algod.compile(source).do();
    return new Uint8Array(Buffer.from(compiled.result, "base64"));
}
//# sourceMappingURL=utils.js.map