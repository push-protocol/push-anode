import { Module, forwardRef } from '@nestjs/common';
import { ArchieveSync } from './archieveSync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ValidatorContractState } from '../validator/validator-contract-state.service';
import { ArchiveModule } from '../archive/archive.module';
import { ValidatorModule } from '../validator/validator.module';

@Module({
  imports: [ValidatorModule, ArchiveModule],
  providers: [ArchieveSync, PrismaService],
  exports: [ArchieveSync],
})
export class ArchieveSyncModule {}
