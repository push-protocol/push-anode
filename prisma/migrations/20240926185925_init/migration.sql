-- CreateTable
CREATE TABLE "Block" (
    "block_hash" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "data_as_json" JSONB NOT NULL,
    "ts" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("block_hash")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "ts" BIGINT NOT NULL DEFAULT 0,
    "txn_hash" VARCHAR(128) NOT NULL,
    "block_hash" VARCHAR(128) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "sender" VARCHAR(64) NOT NULL,
    "status" VARCHAR(64) NOT NULL,
    "from" VARCHAR(128) NOT NULL,
    "recipients" JSONB NOT NULL,
    "data" BYTEA NOT NULL,
    "data_as_json" JSONB NOT NULL,
    "sig" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("txn_hash")
);

-- CreateTable
CREATE TABLE "dsetClient" (
    "id" SERIAL NOT NULL,
    "queue_name" TEXT NOT NULL,
    "target_node_id" TEXT NOT NULL,
    "target_node_url" TEXT NOT NULL,
    "target_offset" BIGINT NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "dsetClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocks_idx" ON "Block"("block_hash");

-- CreateIndex
CREATE INDEX "transaction_block_hash_idx" ON "Transaction"("block_hash");

-- CreateIndex
CREATE INDEX "Transaction_recipients_idx" ON "Transaction" USING GIN ("recipients" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "dsetClient_queue_name_target_node_id_key" ON "dsetClient"("queue_name", "target_node_id");
