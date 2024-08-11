import { Module } from "@nestjs/common";
import { TxService } from "./tx.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  providers: [TxService, PrismaService],
  exports: [TxService],
})
export class TxModule {}
