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
CREATE UNIQUE INDEX "dsetClient_queue_name_target_node_id_key" ON "dsetClient"("queue_name", "target_node_id");
