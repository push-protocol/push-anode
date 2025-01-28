-- CreateTable
CREATE TABLE "anodeSyncInfo" (
    "id" SERIAL NOT NULL,
    "anode_url" TEXT NOT NULL,
    "ts_cutoff" BIGINT NOT NULL,
    "offset" BIGINT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 0,
    "total_blocks" BIGINT NOT NULL,

    CONSTRAINT "anodeSyncInfo_pkey" PRIMARY KEY ("id")
);
