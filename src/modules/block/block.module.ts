import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ArchiveNodeService } from '../archive/archive-node.service';
import { ArchiveModule } from '../archive/archive.module';

@Module({
  imports: [ArchiveModule],
  providers: [BlockService, PrismaService],
  exports: [BlockService],
})
export class BlockModule {}
