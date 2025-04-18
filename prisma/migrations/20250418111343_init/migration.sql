-- CreateIndex
CREATE INDEX "block_ts_idx" ON "Block"("ts");

-- CreateIndex
CREATE INDEX "transaction_ts_idx" ON "Transaction"("ts");

-- CreateIndex
CREATE INDEX "transaction_category_idx" ON "Transaction"("category");
