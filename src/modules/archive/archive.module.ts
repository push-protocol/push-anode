import { Module } from '@nestjs/common';
import { ArchiveNodeService } from './archive-node.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ValidatorContractState } from '../validator/validator-contract-state.service';
import { ValidatorModule } from '../validator/validator.module';
import { WebSocketModule } from '../websockets/webdocket.module';

@Module({
  imports: [PrismaModule, ValidatorModule, WebSocketModule],
  providers: [ArchiveNodeService],
  exports: [ArchiveNodeService],
})
export class ArchiveModule {}
