"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckR = exports.BlockUtil = void 0;
const block_pb_1 = require("../generated/block_pb");
const arrayUtil_1 = require("./arrayUtil");
const bitUtil_1 = require("./bitUtil");
const chainUtil_1 = require("./chainUtil");
const check_1 = require("./check");
const dateUtil_1 = __importDefault(require("./dateUtil"));
const envLoader_1 = require("./envLoader");
const EthUtil_1 = require("./EthUtil");
const hashUtil_1 = require("./hashUtil");
const numUtil_1 = require("./numUtil");
const solUtil_1 = require("./solUtil");
const starkNetUtil_1 = require("./starkNetUtil");
const strUtil_1 = __importDefault(require("./strUtil"));
const winstonUtil_1 = require("./winstonUtil");
const pushSdkUtil_1 = require("./pushSdkUtil");
class BlockUtil {
    static parseTx(txRaw) {
        if (txRaw == null || txRaw.length > BlockUtil.MAX_TRANSACTION_SIZE_BYTES) {
            throw new Error('tx size is too big');
        }
        const tx = block_pb_1.Transaction.deserializeBinary(txRaw);
        return tx;
    }
    static parseBlock(bRaw) {
        const b = block_pb_1.Block.deserializeBinary(bRaw);
        return b;
    }
    static hashTxAsHex(txRaw) {
        return bitUtil_1.BitUtil.bytesToBase16(BlockUtil.hashTx(txRaw));
    }
    static hashTx(txRaw) {
        return hashUtil_1.HashUtil.sha256AsBytes(txRaw);
    }
    static hashBlockAsHex(blockRaw) {
        return bitUtil_1.BitUtil.bytesToBase16(hashUtil_1.HashUtil.sha256AsBytes(blockRaw));
    }
    // when the block has not been signed, we still need a valid immutable hash based on tx data
    // this is used to cache the block contents
    // Deprecated
    static hashBlockIncomplete(blockObj) {
        const txHashes = [];
        for (const txObj of blockObj.getTxobjList()) {
            const tx = txObj.getTx();
            const txHash = BlockUtil.hashTx(tx.serializeBinary());
            txHashes.push(txHash);
        }
        return bitUtil_1.BitUtil.bytesToBase16(hashUtil_1.HashUtil.sha256ArrayAsBytes(txHashes));
    }
    static blockToJson(block) {
        return JSON.stringify(block.toObject());
    }
    static transactionToJson(tx) {
        return JSON.stringify(tx.toObject());
    }
    static blockToBase16(block) {
        return bitUtil_1.BitUtil.bytesToBase16(block.serializeBinary());
    }
    static transactionToBase16(tx) {
        return bitUtil_1.BitUtil.bytesToBase16(tx.serializeBinary());
    }
    static calculateAffectedShard(walletInCaip, shardCount) {
        if (strUtil_1.default.isEmpty(walletInCaip)) {
            return null;
        }
        const [caip, err] = chainUtil_1.ChainUtil.parseCaipAddress(walletInCaip);
        if (err != null) {
            throw new Error('invalid caip address:' + err);
        }
        if (!(caip != null &&
            !strUtil_1.default.isEmpty(caip.addr) &&
            caip.addr.length > 4)) {
            return null;
        }
        const addrWithoutPrefix = !caip.addr.startsWith('0x') ? caip.addr : caip.addr.substring(2);
        const sha = hashUtil_1.HashUtil.sha256AsBytesEx(bitUtil_1.BitUtil.stringToBytesUtf(addrWithoutPrefix));
        const shardId = sha[0];
        check_1.Check.notNull(shardId);
        check_1.Check.isTrue(shardId >= 0 && shardId <= 255 && numUtil_1.NumUtil.isRoundedInteger(shardId));
        check_1.Check.isTrue(shardCount >= 1);
        return shardId % shardCount;
    }
    static calculateAffectedShardsTx(tx, shardCount, shards = new Set()) {
        const category = tx.getCategory();
        if (category === 'INIT_DID') {
            return shards;
        }
        const senderAndRecipients = [tx.getSender(), ...tx.getRecipientsList()];
        for (const wallet of senderAndRecipients) {
            const shardId = this.calculateAffectedShard(wallet, shardCount);
            if (shardId == null) {
                continue;
            }
            shards.add(shardId);
        }
        return shards;
    }
    /**
     * Evaluates all messageBlock target recipients (normally these are addresses)
     * for every included packet
     *
     * And for every tx finds which shard will host this address
     *
     * @param block
     * @param shardCount total amount of shards; see smart contract for this value
     * @returns a set of shard ids
     */
    static calculateAffectedShards(block, shardCount) {
        const shards = new Set();
        for (const txObj of block.getTxobjList()) {
            const tx = txObj.getTx();
            this.calculateAffectedShardsTx(tx, shardCount, shards);
        }
        return shards;
    }
    static checkValidatorTokenFormat(apiTokenBytes) {
        const token = bitUtil_1.BitUtil.bytesUtfToString(apiTokenBytes);
        if (strUtil_1.default.isEmpty(token) || !token.startsWith(BlockUtil.VAL_TOKEN_PREFIX)) {
            return CheckR.failWithText(`invalid attestor token; ${strUtil_1.default.fmt(apiTokenBytes)} should start with ${BlockUtil.ATT_TOKEN_PREFIX}`);
        }
        return CheckR.ok();
    }
    static checkAttestTokenFormat(attestorTokenBytes) {
        const token = bitUtil_1.BitUtil.bytesUtfToString(attestorTokenBytes);
        if (strUtil_1.default.isEmpty(token) || !token.startsWith(BlockUtil.ATT_TOKEN_PREFIX)) {
            return CheckR.failWithText(`invalid attestor token; ${strUtil_1.default.fmt(attestorTokenBytes)} should start with ${BlockUtil.ATT_TOKEN_PREFIX}`);
        }
        return CheckR.ok();
    }
    // for tests
    // signs InitDid(has masterPublicKey field) with the same private key
    static async signInitDid(tx, evmWallet) {
        check_1.Check.isTrue(arrayUtil_1.ArrayUtil.isEmpty(tx.getSignature_asU8()), ' clear the signature field first, signature is:' + tx.getSignature());
        check_1.Check.isTrue(tx.getCategory() == 'INIT_DID', 'not an INIT_DID transaction');
        const initDid = block_pb_1.InitDid.deserializeBinary(tx.getData_asU8());
        check_1.Check.isTrue(initDid.getMasterpubkey() == evmWallet.publicKey, `masterPublicKey ${initDid.getMasterpubkey()}
       does not match evmWallet publicKey ${evmWallet.publicKey}`);
        const tmpBytes = pushSdkUtil_1.PushSdkUtil.messageBytesToHashBytes(tx.serializeBinary());
        const sig = await EthUtil_1.EthUtil.signBytes(evmWallet, tmpBytes);
        tx.setSignature(sig);
    }
    // for tests
    static async signTxEVM(tx, evmWallet) {
        check_1.Check.isTrue(arrayUtil_1.ArrayUtil.isEmpty(tx.getSignature_asU8()), ' clear the signature field first, signature is:' + tx.getSignature());
        const tmpBytes = pushSdkUtil_1.PushSdkUtil.messageBytesToHashBytes(tx.serializeBinary());
        const sig = await EthUtil_1.EthUtil.signBytes(evmWallet, tmpBytes);
        tx.setSignature(sig);
    }
    // for tests
    static async signTxSolana(tx, solanaPrivateKey) {
        check_1.Check.isTrue(arrayUtil_1.ArrayUtil.isEmpty(tx.getSignature_asU8()), ' clear the signature field first, signature is:' + tx.getSignature());
        const tmpBytes = pushSdkUtil_1.PushSdkUtil.messageBytesToHashBytes(tx.serializeBinary());
        const sig = solUtil_1.SolUtil.signBytes(solanaPrivateKey, tmpBytes);
        tx.setSignature(sig);
    }
    // for tests
    static async signTxStarkNet(tx, starkNetPrivateKey) {
        check_1.Check.isTrue(arrayUtil_1.ArrayUtil.isEmpty(tx.getSignature_asU8()), ' clear the signature field first, signature is:' + tx.getSignature());
        const tmpBytes = pushSdkUtil_1.PushSdkUtil.messageBytesToHashBytes(tx.serializeBinary());
        const sig = starkNetUtil_1.StarkNetUtil.signBytes(starkNetPrivateKey, tmpBytes);
        tx.setSignature(sig);
    }
    static async checkTxSignature(tx) {
        const [caip, err] = chainUtil_1.ChainUtil.parseCaipAddress(tx.getSender());
        if (err != null) {
            return CheckR.failWithText('failed to parse caip address: ' + err);
        }
        if (!arrayUtil_1.ArrayUtil.hasMinSize(tx.getSignature_asU8(), 4)) {
            return CheckR.failWithText('signature should have at least 4 bytes size');
        }
        this.log.debug("checking signature `%s`", strUtil_1.default.fmt(tx.getSignature_asU8()));
        if (tx.getCategory() === 'INIT_DID') {
            const sig = tx.getSignature_asU8();
            const tmp = block_pb_1.Transaction.deserializeBinary(tx.serializeBinary());
            tmp.setSignature(null);
            const tmpBytes = tmp.serializeBinary();
            const initDid = block_pb_1.InitDid.deserializeBinary(tx.getData_asU8());
            const masterPublicKeyBytesUncompressed = bitUtil_1.BitUtil.hex0xToBytes(initDid.getMasterpubkey());
            const sigCheck = await pushSdkUtil_1.PushSdkUtil.checkPushInitDidSignature(masterPublicKeyBytesUncompressed, tmpBytes, sig);
            if (!sigCheck.success) {
                return CheckR.failWithText(sigCheck.err);
            }
            return CheckR.ok();
        }
        const sig = tx.getSignature_asU8();
        const tmp = block_pb_1.Transaction.deserializeBinary(tx.serializeBinary());
        tmp.setSignature(null);
        const tmpBytes = tmp.serializeBinary();
        const sigCheck = await pushSdkUtil_1.PushSdkUtil.checkPushNetworkSignature(caip.namespace, caip.chainId, caip.addr, tmpBytes, sig);
        if (!sigCheck.success) {
            return CheckR.failWithText(sigCheck.err);
        }
        return CheckR.ok();
    }
    static async checkTx(tx) {
        const checkToken = BlockUtil.checkValidatorTokenFormat(tx.getApitoken_asU8());
        if (!checkToken.success) {
            return checkToken;
        }
        if (tx.getType() != 0) {
            return CheckR.failWithText(`Only non-value transactions are supported`);
        }
        if (!chainUtil_1.ChainUtil.isFullCAIPAddress(tx.getSender())) {
            return CheckR.failWithText(`sender ${tx.getSender()} is not in full CAIP format ${tx.getSender()}`);
        }
        // todo how many recipients are required per each tx type?
        for (const recipientAddr of tx.getRecipientsList()) {
            if (!chainUtil_1.ChainUtil.isFullCAIPAddress(recipientAddr)) {
                return CheckR.failWithText(`recipient ${recipientAddr} is not in full CAIP format ${tx.getSender()}`);
            }
        }
        if (!arrayUtil_1.ArrayUtil.hasMinSize(tx.getSalt_asU8(), 4)) {
            return CheckR.failWithText(`salt field requires >=4 bytes ; ` + strUtil_1.default.fmt(tx.getSalt_asU8()));
        }
        const payloadCheck = await BlockUtil.checkTxPayload(tx);
        if (!payloadCheck.success) {
            return payloadCheck;
        }
        const validSignature = await BlockUtil.checkTxSignature(tx);
        if (!validSignature.success) {
            return CheckR.failWithText(validSignature.err);
        }
        return CheckR.ok();
    }
    static async checkTxPayload(tx) {
        if (tx.getCategory() === 'INIT_DID') {
            const txData = block_pb_1.InitDid.deserializeBinary(tx.getData_asU8());
            if (strUtil_1.default.isEmpty(txData.getMasterpubkey())) {
                CheckR.failWithText(`masterPubKey missing`);
            }
            if (strUtil_1.default.isEmpty(txData.getDerivedpubkey())) {
                CheckR.failWithText(`derivedPubKey missing`);
            }
            if (txData.getWallettoencderivedkeyMap().size < 1) {
                CheckR.failWithText(`encDerivedPrivKey missing`);
            }
        }
        else if (tx.getCategory().startsWith("CUSTOM:")) {
            // no checks for user-defined transactions
        }
        else {
            CheckR.failWithText(`unsupported transaction category`);
        }
        return CheckR.ok();
    }
    // for tests
    static async signBlockAsValidator(wallet, blockNoSigs) {
        check_1.Check.isTrue(blockNoSigs.getSignersList().length == 0);
        for (const txObj of blockNoSigs.getTxobjList()) {
            const voteObj = new block_pb_1.TxValidatorData();
            voteObj.setVote(block_pb_1.Vote.ACCEPTED);
            txObj.setValidatordata(voteObj);
            txObj.clearAttestordataList();
        }
        const ethSig = await EthUtil_1.EthUtil.signBytes(wallet, blockNoSigs.serializeBinary());
        const vSign = new block_pb_1.Signer();
        vSign.setSig(ethSig);
        blockNoSigs.setSignersList([vSign]);
    }
    // for tests
    static async signBlockAsAttestor(wallet, blockSignedByV) {
        const tmpBlock = block_pb_1.Block.deserializeBinary(blockSignedByV.serializeBinary());
        check_1.Check.isTrue(blockSignedByV.getSignersList().length == 1);
        // tmp block with vsig + attestor data gets signed
        const ar = new block_pb_1.AttestBlockResult();
        for (const txObj of tmpBlock.getTxobjList()) {
            const attestorData = new block_pb_1.TxAttestorData();
            attestorData.setVote(block_pb_1.Vote.ACCEPTED);
            ar.getAttestordataList().push(attestorData);
            txObj.setAttestordataList([attestorData]);
        }
        const ethSig = await EthUtil_1.EthUtil.signBytes(wallet, tmpBlock.serializeBinary());
        // embed attestor data and signature into real object
        const aSign = new block_pb_1.Signer();
        aSign.setSig(ethSig);
        ar.setSigner(aSign);
        return ar;
    }
    // for tests
    static async appendPatchAsValidator(wallet, blockSignedByVA, ar) {
        for (let txIndex = 0; txIndex < blockSignedByVA.getTxobjList().length; txIndex++) {
            const attestDataPerTx = ar.getAttestordataList()[txIndex];
            blockSignedByVA.getTxobjList()[txIndex].getAttestordataList().push(attestDataPerTx);
        }
        blockSignedByVA.getSignersList().push(ar.getSigner());
    }
    static async recoverPatchAddress(wallet, blockSignedByVA, ar) {
        const tmpBlock = block_pb_1.Block.deserializeBinary(blockSignedByVA.serializeBinary());
        // tx0 -> attest0, ...
        // is restructured into
        // block.txObj[0].tx -> attest0, ...
        for (let txIndex = 0; txIndex < tmpBlock.getTxobjList().length; txIndex++) {
            const attestDataPerTx = ar.getAttestordataList()[txIndex];
            tmpBlock.getTxobjList()[txIndex].setAttestordataList([attestDataPerTx]);
        }
        const aSignatureBytes = ar.getSigner().getSig_asU8();
        const tmpBlockBytes = tmpBlock.serializeBinary();
        this.log.debug('recovery pub key from block with hash: %s', EthUtil_1.EthUtil.ethHash(tmpBlockBytes));
        const attestorNodeId = EthUtil_1.EthUtil.recoverAddressFromMsg(tmpBlockBytes, aSignatureBytes);
        this.log.debug('attestorNodeId %o', attestorNodeId);
        return attestorNodeId;
    }
    static async recoverSignerAddress(blockSignedByVA, signerIndex) {
        var _a;
        check_1.Check.isTrue(signerIndex >= 0 && signerIndex < blockSignedByVA.getSignersList().length, 'signer out of index');
        if (signerIndex == 0) {
            // validator
            const validatorSignature = (_a = blockSignedByVA.getSignersList()[0]) === null || _a === void 0 ? void 0 : _a.getSig_asU8();
            check_1.Check.notNull(validatorSignature, "validator signature is required");
            const tmpBlock = block_pb_1.Block.deserializeBinary(blockSignedByVA.serializeBinary());
            tmpBlock.clearSignersList();
            for (const txObj of tmpBlock.getTxobjList()) {
                txObj.clearAttestordataList();
            }
            const blockBytesNoSigners = tmpBlock.serializeBinary();
            const blockValidatorNodeId = EthUtil_1.EthUtil.recoverAddressFromMsg(blockBytesNoSigners, validatorSignature);
            BlockUtil.log.debug('signature # %s by %s (validator) ', 0, blockValidatorNodeId);
            return blockValidatorNodeId;
        }
        else {
            const tmpBlock = block_pb_1.Block.deserializeBinary(blockSignedByVA.serializeBinary());
            const onlyVSignature = [blockSignedByVA.getSignersList()[0]];
            tmpBlock.setSignersList(onlyVSignature);
            for (let txIndex = 0; txIndex < tmpBlock.getTxobjList().length; txIndex++) {
                const txObj = tmpBlock.getTxobjList()[txIndex];
                const onlyOneAttestation = blockSignedByVA.getTxobjList()[txIndex].getAttestordataList()[signerIndex - 1];
                txObj.setAttestordataList([onlyOneAttestation]);
            }
            const blockBytesNoSignersAnd1Attest = tmpBlock.serializeBinary();
            const attSignature = blockSignedByVA.getSignersList()[signerIndex].getSig_asU8();
            const attNodeId = EthUtil_1.EthUtil.recoverAddressFromMsg(blockBytesNoSignersAnd1Attest, attSignature);
            BlockUtil.log.debug('signature # %s by %s ', signerIndex - 1, attNodeId);
            return attNodeId;
        }
    }
    static async checkBlockAsAttestor(blockSignedByV, validatorsFromContract) {
        const checkToken = BlockUtil.checkAttestTokenFormat(blockSignedByV.getAttesttoken_asU8());
        if (!checkToken.success) {
            return checkToken;
        }
        if (blockSignedByV.getTxobjList().length >= BlockUtil.MAX_TRANSACTIONS_PER_BLOCK) {
            return CheckR.failWithText(`block is full; tx count: ${blockSignedByV.getTxobjList().length} ; limit: ${BlockUtil.MAX_TRANSACTIONS_PER_BLOCK} `);
        }
        if (BlockUtil.ATTESTOR_MAX_BLOCK_AGE_SECONDS != null &&
            BlockUtil.ATTESTOR_MAX_BLOCK_AGE_SECONDS > 0 &&
            Math.abs(blockSignedByV.getTs() - dateUtil_1.default.currentTimeMillis()) > 1000 * BlockUtil.ATTESTOR_MAX_BLOCK_AGE_SECONDS) {
            return CheckR.failWithText(`block is too old: ${blockSignedByV.getTs()}`);
        }
        if (!arrayUtil_1.ArrayUtil.hasMinSize(blockSignedByV.getAttesttoken_asU8(), 4)) {
            return CheckR.failWithText('attest token is missing or too small (4bytes min)');
        }
        // all tx should be valid
        let totalTxBytes = 0;
        for (let i = 0; i < blockSignedByV.getTxobjList().length; i++) {
            const txObj = blockSignedByV.getTxobjList()[i];
            const tx = txObj.getTx();
            if (tx == null) {
                return CheckR.failWithText('empty transaction found!');
            }
            const txBytes = tx.serializeBinary().length;
            totalTxBytes += txBytes;
            if (txBytes > BlockUtil.MAX_TRANSACTION_SIZE_BYTES) {
                return CheckR.failWithText(`transaction size exceeds the limit: ${txBytes} ; limit: ${BlockUtil.MAX_TRANSACTION_SIZE_BYTES}`);
            }
            if (txObj.getValidatordata() == null || !BlockUtil.VALID_VALIDATOR_VOTES.has(txObj.getValidatordata().getVote())) {
                return CheckR.failWithText(`tx # ${i} has invalid validator data`);
            }
            const check1 = await BlockUtil.checkTx(tx);
            if (!check1.success) {
                return check1;
            }
        }
        if (totalTxBytes > BlockUtil.MAX_TOTAL_TRANSACTION_SIZE_BYTES) {
            return CheckR.failWithText(`total transaction size exceeds the limit: ${totalTxBytes} ; limit: ${BlockUtil.MAX_TOTAL_TRANSACTION_SIZE_BYTES}`);
        }
        // number of signatures should be equal to number of attestations
        if (blockSignedByV.getSignersList().length == 0) {
            return CheckR.failWithText(`at least validator signature is required`);
        }
        const sigCount = blockSignedByV.getSignersList().length;
        for (const txObj of blockSignedByV.getTxobjList()) {
            if (txObj.getAttestordataList().length != sigCount - 1) {
                return CheckR.failWithText(`number of tx attestations (salt=${txObj.getTx().getSalt()}) does not match with signature count`);
            }
        }
        // do a v signature check
        const blockValidatorNodeId = await BlockUtil.recoverSignerAddress(blockSignedByV, 0);
        BlockUtil.log.debug('signature # %s by %s (validator) ', 0, blockValidatorNodeId);
        const allowed = validatorsFromContract.has(blockValidatorNodeId);
        check_1.Check.isTrue(allowed, `unregistered validator: ${blockValidatorNodeId}`);
        return CheckR.ok();
    }
    static async checkBlockFinalized(blockSignedByVA, validatorsFromContract, valPerBlockFromContract) {
        const check1 = await BlockUtil.checkBlockAsAttestor(blockSignedByVA, validatorsFromContract);
        if (!check1.success) {
            return check1;
        }
        const sigCount = blockSignedByVA.getSignersList().length;
        if (sigCount != valPerBlockFromContract) {
            return CheckR.failWithText(`block has only ${sigCount} signatures; expected ${valPerBlockFromContract} signatures `);
        }
        for (const txObj of blockSignedByVA.getTxobjList()) {
            if (txObj.getAttestordataList().length != sigCount - 1) {
                return CheckR.failWithText(`number of tx attestations (salt=${txObj.getTx().getSalt()}) does not match with signature count`);
            }
        }
        const attestorCount = sigCount - 1;
        for (let txIndex = 0; txIndex < blockSignedByVA.getTxobjList().length; txIndex++) {
            const txObj = blockSignedByVA.getTxobjList()[txIndex];
            const tx = txObj.getTx();
            if (tx == null) {
                return CheckR.failWithText('empty transaction found!');
            }
            if (txObj.getAttestordataList() == null || txObj.getAttestordataList().length != attestorCount) {
                return CheckR.failWithText(`tx # ${txIndex} has invalid number of attestations; ${txObj.getAttestordataList().length} instead of ${attestorCount}`);
            }
            for (const txAttData of txObj.getAttestordataList()) {
                if (txAttData == null || !BlockUtil.VALID_ATTESTOR_VOTES.has(txAttData.getVote())) {
                    return CheckR.failWithText(`tx # ${txIndex} has invalid attestor data`);
                }
            }
        }
        // do A signature check
        // this requires clearing all signatures + all attestor data except the current one
        const tmpBlock = block_pb_1.Block.deserializeBinary(blockSignedByVA.serializeBinary());
        const onlyVSignature = [blockSignedByVA.getSignersList()[0]];
        tmpBlock.setSignersList(onlyVSignature);
        for (let attIndex = 1; attIndex < sigCount; attIndex++) {
            const attNodeId = await BlockUtil.recoverSignerAddress(blockSignedByVA, attIndex);
            BlockUtil.log.debug('signature # %s by %s ', attIndex - 1, attNodeId);
            const allowed = validatorsFromContract.has(attNodeId);
            check_1.Check.isTrue(allowed, `unregistered validator_: ${attNodeId}`);
        }
        return CheckR.ok();
    }
}
exports.BlockUtil = BlockUtil;
BlockUtil.log = winstonUtil_1.WinstonUtil.newLog(BlockUtil);
// max serialized tx size
BlockUtil.MAX_TRANSACTION_SIZE_BYTES = envLoader_1.EnvLoader.getPropertyAsNumber('MAX_TRANSACTION_SIZE_BYTES', 1000000);
// max total tx data in a block ,
// when reached block would stop accepting transactions
BlockUtil.MAX_TOTAL_TRANSACTION_SIZE_BYTES = envLoader_1.EnvLoader.getPropertyAsNumber('MAX_TOTAL_TRANSACTION_SIZE_BYTES', 10 * 1000000);
// max total tx count
// when reached block would stop accepting transactions
BlockUtil.MAX_TRANSACTIONS_PER_BLOCK = envLoader_1.EnvLoader.getPropertyAsNumber('MAX_TRANSACTION_PER_BLOCK', 1000);
// blocks older than this would get rejected by attestors
// note: attestor should have an up-to-date clock time for this (!)
BlockUtil.ATTESTOR_MAX_BLOCK_AGE_SECONDS = envLoader_1.EnvLoader.getPropertyAsNumber('MAX_BLOCK_AGE_SECONDS', 0);
// we will cache incomplete blocks for this amount of seconds
// attestSignatures will stop working after this time
BlockUtil.MAX_BLOCK_ASSEMBLY_TIME_SECONDS = envLoader_1.EnvLoader.getPropertyAsNumber('MAX_BLOCK_ASSEMBLY_TIME_SECONDS', 60);
BlockUtil.VALID_VALIDATOR_VOTES = new Set([1]);
BlockUtil.VALID_ATTESTOR_VOTES = new Set([1, 2]);
BlockUtil.ATT_TOKEN_PREFIX = 'AT1';
BlockUtil.VAL_TOKEN_PREFIX = 'VT1';
class CheckR {
    static failWithText(err) {
        return { success: false, err: err };
    }
    static ok() {
        return { success: true, err: '' };
    }
}
exports.CheckR = CheckR;
//# sourceMappingURL=blockUtil.js.map