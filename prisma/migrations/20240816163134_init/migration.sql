-- CreateTable
CREATE TABLE "Block" (
    "block_hash" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Block_pkey" PRIMARY KEY ("block_hash")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "block_hash" VARCHAR(128) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "recipients" JSONB,
    "data" TEXT NOT NULL,
    "data_as_json" JSONB,
    "sig" TEXT NOT NULL,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("sig")
);

-- CreateIndex
CREATE INDEX "blocks_idx" ON "Block"("block_hash");

-- CreateIndex
CREATE INDEX "transaction_block_hash_idx" ON "Transaction"("block_hash");
