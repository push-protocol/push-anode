import { WebSocket, WebSocketServer } from 'ws';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { SubscriptionHandler } from './subscriptionHandler';
import { ConnectionManager } from './connectionManager';
import { EventBroadcaster } from './eventBroadcaster';
import { ErrorHandler } from './errorHandler';
import { WSMessage } from './types';
import { Server } from 'http';
import { INestApplication, Injectable } from '@nestjs/common';
import { OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class ArchiveNodeWebSocketServer implements OnApplicationShutdown  {
    private wss: WebSocketServer;
    private readonly log = WinstonUtil.newLog("ArchiveNodeWebSocketServer");
    private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
    private readonly CONNECTION_TIMEOUT = 35000; // 35 seconds
    private heartbeatInterval: NodeJS.Timeout;

    constructor(
        private readonly subscriptionHandler: SubscriptionHandler,
        private readonly connectionManager: ConnectionManager,
        private readonly eventBroadcaster: EventBroadcaster,
        private readonly errorHandler: ErrorHandler
    ) {}

    async onApplicationShutdown(signal?: string) {
        this.log.info(`Shutting down WebSocket server (signal: ${signal})`);
        await this.shutdown();
    }

    async initialize(app: INestApplication) {
        if (!app) {
            throw new Error('NestJS application instance is required');
        }

        const server: Server = app.getHttpServer();
        if (!server) {
            throw new Error('HTTP server not found in NestJS application');
        }

        try {
            this.wss = new WebSocketServer({ server });
            
            this.wss.on('connection', (ws: WebSocket) => {
                this.handleNewConnection(ws);
            });

            // Start heartbeat interval
            this.heartbeatInterval = setInterval(() => {
                this.checkConnections();
            }, this.HEARTBEAT_INTERVAL);

            const addr = server.address();
            const port = typeof addr === 'string' ? addr : addr?.port;

            let artwork =
    `    
 ____            _           _             _     _            
|  _ \\ _   _ ___| |__      / \\   _ __ ___| |__ (_)_   _____ 
| |_) | | | / __| '_ \\    / _ \\ | '__/ __| '_ \\| \\ \\ / / _ \\
|  __/| |_| \\__ \\ | | |  / ___ \\| | | (__| | | | |\\ V /  __/
|_|   \\__,_|___/_| |_| /_/   \\_\\_|  \\___|_| |_|_| \\_/ \\___|
__        __   _    ____            _        _   
\\ \\      / /__| |__/ ___|  ___  ___| | _____| |_ 
 \\ \\ /\\ / / _ \\ '_ \\___ \\ / _ \\/ __| |/ / _ \\ __|
  \\ V  V /  __/ |_) |__) |  __/ (__|   <  __/ |_ 
   \\_/\\_/ \\___|_.__/____/ \\___|\\___|_|\\_\\___|\\__|
`;

            console.log(`
                ################################################
                ${artwork}
                🛡️ WebSocket Server listening on port: ${port} 🛡️
                ################################################
            `);
        } catch (error) {
            this.log.error('Failed to initialize WebSocket server:', error);
            throw error;
        }
    }

    async shutdown() {
        const subscribers = this.subscriptionHandler.getSubscribers();

        // Clear heartbeat interval
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Close all connections
        for (const [nodeId, info] of subscribers) {
            info.ws.close();
        }
        
        if (this.wss) {
            await new Promise<void>((resolve) => this.wss.close(() => resolve()));
        }
    }

    private handleNewConnection(ws: WebSocket) {
        ws.on('pong', () => {
            const subscriber = this.subscriptionHandler.findSubscriberByWebSocket(ws);
            if (subscriber) {
                this.subscriptionHandler.updateLastPong(subscriber.nodeId);
            }
        });

        // Handle disconnection
        ws.on('close', () => {
            this.handleDisconnection(ws);
        });

        // Handle errors
        ws.on('error', (error) => {
            this.log.error('WebSocket error:', error);
            this.handleDisconnection(ws);
        });

        ws.on('message', async (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString()) as WSMessage;
                await this.handleMessage(ws, message);
            } catch (error) {
                this.errorHandler.handleConnectionError(ws, error);
            }
        });
    }

    private checkConnections() {
        console.log("Checking connections...");
        const now = Date.now();
        const subscribers = this.subscriptionHandler.getSubscribers();

        for (const [nodeId, info] of subscribers) {
            // Check if connection has timed out
            if (info.lastPong && (now - info.lastPong > this.CONNECTION_TIMEOUT)) {
                this.log.warn(`Connection timeout for node ${nodeId}`);
                info.ws.terminate();
                this.subscriptionHandler.removeSubscriber(nodeId);
                continue;
            }

            // Send ping
            try {
                info.ws.ping();
            } catch (error) {
                this.log.error(`Failed to ping node ${nodeId}:`, error);
                info.ws.terminate();
                this.subscriptionHandler.removeSubscriber(nodeId);
            }
        }
    }

    private handleDisconnection(ws: WebSocket) {
        const subscriber = this.subscriptionHandler.findSubscriberByWebSocket(ws);
        if (subscriber) {
            this.log.info(`Node ${subscriber.nodeId} disconnected`);
            this.subscriptionHandler.removeSubscriber(subscriber.nodeId);
        }
    }

    private async handleMessage(ws: WebSocket, message: WSMessage) {
        switch (message.type) {
            case 'SUBSCRIBE':
                await this.subscriptionHandler.handleSubscriptionRequest(ws, message);
                break;
            default:
                this.errorHandler.handleInvalidMessage(ws, 'Unknown message type');
        }
    }
}