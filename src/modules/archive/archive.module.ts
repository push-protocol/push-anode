import { Module } from '@nestjs/common';
import { ArchiveNodeService } from './archive-node.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ValidatorContractState } from '../validator/validator-contract-state.service';
import { ValidatorModule } from '../validator/validator.module';

@Module({
  imports: [PrismaModule, ValidatorModule],
  providers: [ArchiveNodeService],
  exports: [ArchiveNodeService],
})
export class ArchiveModule {}
