import { Module } from '@nestjs/common';
import { ArchiveNodeWebSocketServer } from './websockerServer';
import { EventBroadcaster } from './eventBroadcaster';
import { SubscriptionHandler } from './subscriptionHandler';
import { ConnectionManager } from './connectionManager';
import { ErrorHandler } from './errorHandler';
import { ValidatorModule } from '../validator/validator.module';

@Module({
    imports: [ValidatorModule],
    providers: [
        ArchiveNodeWebSocketServer,
        EventBroadcaster,
        SubscriptionHandler,
        ConnectionManager,
        ErrorHandler
    ],
    exports: [ArchiveNodeWebSocketServer, EventBroadcaster]
})

export class WebSocketModule {}