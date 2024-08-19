import { Module } from '@nestjs/common';
import { NestjsJsonRpcModule, TransportType } from '@klerick/nestjs-json-rpc';
import { BlockModule } from './modules/block/block.module';
import { TxModule } from './modules/tx/tx.module';
import { RpcService } from './rpc.service'; // Import your new RPC service

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
})
export class AppModule {}
