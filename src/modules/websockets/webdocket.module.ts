import { Module } from '@nestjs/common';
import { ArchiveNodeWebSocketServer } from './websockerServer';
import { EventBroadcaster } from './eventBroadcaster';
import { SubscriptionHandler } from './subscriptionHandler';
import { ConnectionManager } from './connectionManager';
import { ErrorHandler } from './errorHandler';
import { MetricsService } from './metricsService';
import { ValidatorModule } from '../validator/validator.module';

@Module({
    imports: [ValidatorModule],
    providers: [
        ArchiveNodeWebSocketServer,
        EventBroadcaster,
        SubscriptionHandler,
        ConnectionManager,
        ErrorHandler,
        MetricsService
    ],
    exports: [ArchiveNodeWebSocketServer, EventBroadcaster]
})

export class WebSocketModule {}