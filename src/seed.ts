import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Function to generate a random hash
function generateRandomHash() {
  return crypto.randomBytes(16).toString('hex');
}

// Function to get a random category
function getRandomCategory() {
  const categories = ['EMAIL', 'NOTIFICATION', 'INIT'];
  return categories[Math.floor(Math.random() * categories.length)];
}

function getRandomSource() {
  const sources = ['ETH_MAINNET', 'POLYGON_MAINNET', 'BSC_MAINNET'];
  return sources[Math.floor(Math.random() * sources.length)];
}


// Function to generate a random Ethereum address in the format 'eip155:<address>'
function generateRandomEthAddress() {
  const ethAddress = '0x' + crypto.randomBytes(20).toString('hex');
  return `eip155:${ethAddress}`;
}

async function main() {
  for (let i = 1; i <= 10; i++) {
    const blockHash = generateRandomHash(); // Generate random block hash

    // Insert block with Unix epoch time for ts
    await prisma.block.create({
      data: {
        block_hash: blockHash,
        data: Buffer.from(`Object data for block ${i}`), // Converting string to Bytes
        ts: Math.floor(Date.now() / 1000), // Convert current date to Unix epoch time
      },
    });

    // Insert 20 transactions for each block
    const transactions = Array.from({ length: 20 }, () => ({
      ts: Math.floor(Date.now() / 1000), // Convert current date to Unix epoch time
      txn_hash: generateRandomHash(), // Generate random transaction hash
      block_hash: blockHash,
      category: getRandomCategory(), // Assign a random category
      source: getRandomSource(), // Generate random source hash
      recipients: {
        recipients: [
          { address: generateRandomEthAddress() },
          { address: generateRandomEthAddress() },
        ],
      },
      data: Buffer.from(`Transaction data for block ${i}`), // Converting string to Bytes
      data_as_json: {
        key1: `value1_block_${i}`,
        key2: `value2_block_${i}`,
      },
      sig: generateRandomHash(), // Generate random signature hash
    }));

    await prisma.transaction.createMany({
      data: transactions,
    });
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
