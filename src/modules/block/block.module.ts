import { Module } from "@nestjs/common";
import { BlockService } from "./block.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  providers: [BlockService, PrismaService],
  exports: [BlockService],
})
export class BlockModule {}
