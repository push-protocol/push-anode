import { Module } from '@nestjs/common';
import { NestjsJsonRpcModule, TransportType } from '@klerick/nestjs-json-rpc';
import { BlockModule } from './modules/block/block.module';
import { TxModule } from './modules/tx/tx.module';
import { RpcService } from './rpc.service'; // Import your new RPC service
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    BlockModule,
    TxModule,
    NestjsJsonRpcModule.forRoot({
      path: 'rpc',
      transport: TransportType.HTTP,
    }),
  ],
  providers: [RpcService],
  controllers: [HealthController],
})
export class AppModule {}
