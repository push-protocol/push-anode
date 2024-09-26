import { Module } from '@nestjs/common';
import { ArchiveNodeService } from './archive-node.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ArchiveNodeService],
  exports: [ArchiveNodeService],
})
export class ArchiveModule {}
