-- CreateTable
CREATE TABLE "Block" (
    "block_hash" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "ts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("block_hash")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "ts" INTEGER NOT NULL DEFAULT 0,
    "txn_hash" VARCHAR(128) NOT NULL,
    "block_hash" VARCHAR(128) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "recipients" JSONB,
    "data" BYTEA NOT NULL,
    "data_as_json" JSONB,
    "sig" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("txn_hash")
);

-- CreateIndex
CREATE INDEX "blocks_idx" ON "Block"("block_hash");

-- CreateIndex
CREATE INDEX "transaction_block_hash_idx" ON "Transaction"("block_hash");

-- CreateIndex
CREATE INDEX "Transaction_recipients_idx" ON "Transaction" USING GIN ("recipients" jsonb_path_ops);
