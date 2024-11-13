import { Module } from '@nestjs/common';
import { NestjsJsonRpcModule, TransportType } from '@klerick/nestjs-json-rpc';
import { BlockModule } from './modules/block/block.module';
import { TxModule } from './modules/tx/tx.module';
import { RpcService } from './rpc.service'; // Import your new RPC service
import { HealthController } from './modules/health/health.controller';
import { QueueModule } from './modules/queue/queue.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { ValidatorModule } from './modules/validator/validator.module';

@Module({
  imports: [
    BlockModule,
    TxModule,
    QueueModule,
    ArchiveModule,
    ValidatorModule,
    NestjsJsonRpcModule.forRoot({
      path: 'rpc',
      transport: TransportType.HTTP
    }),
  ],
  providers: [RpcService],
  controllers: [HealthController],
})
export class AppModule {}
