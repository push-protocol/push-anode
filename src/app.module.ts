import { Module } from '@nestjs/common';
import { NestjsJsonRpcModule, TransportType } from '@klerick/nestjs-json-rpc';
import { BlockModule } from './modules/block/block.module';
import { TxModule } from './modules/tx/tx.module';
import { RpcService } from './rpc.service';
import { HealthController } from './modules/health/health.controller';
import { QueueModule } from './modules/queue/queue.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { ValidatorModule } from './modules/validator/validator.module';
import { ArchieveSyncModule } from './modules/archieveSync/archieve.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    BlockModule,
    TxModule,
    QueueModule,
    ArchiveModule,
    ValidatorModule,
    ArchieveSyncModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 sec
        limit: 60, // 30 requests per minute
      },
    ]),
    NestjsJsonRpcModule.forRoot({
      path: 'rpc',
      transport: TransportType.HTTP,
    }),
  ],
  providers: [
    RpcService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [HealthController],
})
export class AppModule {}
