import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  for (let i = 1; i <= 10; i++) {
    const blockHash = `block_hash_${i}`;

    // Insert block with Unix epoch time for ts
    await prisma.block.create({
      data: {
        block_hash: blockHash,
        data: Buffer.from(`Object data for block ${i}`), // Converting string to Bytes
        ts: Math.floor(Date.now() / 1000), // Convert current date to Unix epoch time
      },
    });

    // Insert 20 transactions for each block
    const transactions = Array.from({ length: 20 }, (_, j) => ({
      ts: Math.floor(Date.now() / 1000), // Convert current date to Unix epoch time
      block_hash: blockHash,
      category: `category_${i}_${j + 1}`,
      source: `source_${i}_${j + 1}`,
      recipients: {
        recipient1: `recipient1_block_${i}_txn_${j + 1}`,
        recipient2: `recipient2_block_${i}_txn_${j + 1}`,
      },
      data: `Transaction data for block ${i}, txn ${j + 1}`,
      data_as_json: {
        key1: `value1_block_${i}_txn_${j + 1}`,
        key2: `value2_block_${i}_txn_${j + 1}`,
      },
      sig: `sig_${i}_${j + 1}`,
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
