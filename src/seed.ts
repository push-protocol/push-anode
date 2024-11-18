import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
  Block,
  TransactionObj,
  InitDid,
  Transaction,
  TxValidatorData,
  Vote,
  TxAttestorData,
  Signer,
} from './generated/push/block_pb';
// Adjust the path if needed

const prisma = new PrismaClient();

// Function to generate a random hash
function generateRandomHash() {
  return crypto.randomBytes(16).toString('hex');
}

function generateRandomEthAddressV2() {
  const ethAddress = '0x' + crypto.randomBytes(20).toString('hex');
  return ethAddress;
}

const chainIdSourceMap: { [key: number]: string } = {
  1: 'ETH_MAINNET',
  56: 'BSC_MAINNET',
  137: 'POLYGON_MAINNET',
};

function generateFullCaipEthAddress(chainId?: number): string {
  // If chainId is not provided, get a random one from the available keys
  if (!chainId) {
    const chainIds = Object.keys(chainIdSourceMap);
    const randomIndex = Math.floor(Math.random() * chainIds.length);
    chainId = Number(chainIds[randomIndex]);
  }

  const ethAddress = '0x' + crypto.randomBytes(20).toString('hex');
  return `eip155:${chainId}:${ethAddress}`;
}

function bufferToHex(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('hex');
}

function recursivelyConvertToJSON(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Uint8Array) {
    return Buffer.from(obj).toString('base64'); // Convert Uint8Array to base64 string
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => recursivelyConvertToJSON(item));
  }

  if (typeof obj === 'object') {
    const convertedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      convertedObj[key] = recursivelyConvertToJSON(value);
    }
    return convertedObj;
  }

  return obj;
}

async function main() {
  for (let i = 1; i <= 100; i++) {
    const blockHash = generateRandomHash(); // Generate random block hash

    // Create a Protobuf Block
    const block = new Block();
    block.setTs(Math.floor(Date.now() / 1000)); // Unix epoch time

    const transactionsData = [];
    const transactions: TransactionObj[] = [];

    for (let j = 1; j <= 100; j++) {
      // Create InitDid message
      const initDid = new InitDid();
      initDid.setMasterpubkey(generateRandomHash());
      initDid.setDerivedkeyindex(j);
      initDid.setDerivedpubkey(generateRandomHash());

      // Create Transaction message
      const tx = new Transaction();

      const senderCaipAddress = generateFullCaipEthAddress(); // Randomly generated CAIP-10 address with chainId
      const chainId = Number(senderCaipAddress.split(':')[1]);
      const source = chainIdSourceMap[chainId];

      tx.setType(0); // Assuming type 0 for INIT_DID
      tx.setCategory('INIT_DID');
      tx.setSender(source);
      tx.setSender(senderCaipAddress);
      tx.setRecipientsList([
        generateFullCaipEthAddress(),
        generateFullCaipEthAddress(),
      ]);
      tx.setData(initDid.serializeBinary());
      tx.setSalt(crypto.randomBytes(16));
      tx.setApitoken(crypto.randomBytes(8));
      tx.setSignature(crypto.randomBytes(16));
      tx.setFee('1');

      // Create TransactionObj
      const txObj = new TransactionObj();
      txObj.setTx(tx);

      // Create TxValidatorData
      const validatorData = new TxValidatorData();
      validatorData.setVote(Vote.ACCEPTED);

      // Create TxAttestorData
      const attestorData = new TxAttestorData();
      attestorData.setVote(Vote.ACCEPTED);

      // Set validator and attestor data in TransactionObj
      txObj.setValidatordata(validatorData);
      txObj.setAttestordataList([attestorData]);

      transactions.push(txObj);

      // Prepare transaction data for the database
      transactionsData.push({
        ts: Math.floor(Date.now() / 1000),
        txn_hash: generateRandomHash(),
        block_hash: blockHash,
        category: txObj.getTx()?.getCategory() ?? '',
        sender: txObj.getTx()?.getSender() ?? '',
        status: 'SUCCESS',
        from: senderCaipAddress,
        recipients: {
          recipients:
            txObj
              .getTx()
              ?.getRecipientsList()
              .map((recipient) => ({ address: recipient })) || [],
        },
        data: Buffer.from(initDid.serializeBinary()), // Convert protobuf message to binary format
        data_as_json: recursivelyConvertToJSON(initDid.toObject()), // Convert to JSON-compatible format
        sig: bufferToHex(
          txObj.getTx()?.getSignature_asU8() || new Uint8Array(),
        ), // Convert signature to hex string
      });
    }

    block.setTxobjList(transactions);

    // Create Signers
    const signer1 = new Signer();
    signer1.setSig(generateRandomHash());

    const signer2 = new Signer();
    signer2.setSig(generateRandomHash());

    block.setSignersList([signer1, signer2]);

    // Serialize Block to bytes for storage
    const blockData = block.serializeBinary();

    // Insert block into the database
    await prisma.block.create({
      data: {
        block_hash: blockHash,
        data_as_json: recursivelyConvertToJSON(block.toObject()),
        data: Buffer.from(blockData),
        ts: block.getTs(),
      },
    });

    // Insert transactions into the database
    await prisma.transaction.createMany({
      data: transactionsData,
    });

    console.log(`Block ${i} with transactions inserted`);
  }

  console.log('Dummy data inserted: 10 blocks with 20 transactions each');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
