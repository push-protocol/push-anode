import { Module } from '@nestjs/common';
import { QueueManagerService } from './queue-manager.service';
import { QueueClientHelper } from './queue-client-helper.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ArchiveModule } from '../archive/archive.module';
import { ValidatorModule } from '../validator/validator.module';

@Module({
  imports: [PrismaModule, ArchiveModule, ValidatorModule],
  providers: [QueueManagerService, QueueClientHelper],
  exports: [QueueManagerService, QueueClientHelper],
})
export class QueueModule {}
