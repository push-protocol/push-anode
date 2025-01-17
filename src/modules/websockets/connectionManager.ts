import { WebSocket } from 'ws';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { MetricsService } from './metricsService';
import { Injectable } from '@nestjs/common';
import { SubscriptionHandler } from './subscriptionHandler';

@Injectable()
export class ConnectionManager {
    private readonly HEARTBEAT_INTERVAL = 60000; // 60 seconds
    private readonly CONNECTION_TIMEOUT = 65000; // 65 seconds
    private readonly log = WinstonUtil.newLog("ConnectionManager");
    private connections = new Map<string, WebSocket>();

    constructor(
        private readonly metrics: MetricsService,
        private readonly subscriptionHandler: SubscriptionHandler
    ) {
        this.startConnectionMonitoring();
    }

    initializeConnection(ws: WebSocket, nodeId: string) {
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        }, this.HEARTBEAT_INTERVAL);

        ws.on('pong', () => {
            const subscriber = this.subscriptionHandler.getSubscribers().get(nodeId);
            if (subscriber) {
                this.subscriptionHandler.updateLastPong(nodeId);
            }
        });

        ws.on('close', () => {
            clearInterval(interval);
            this.handleDisconnection(nodeId);
        });

        ws.on('error', (error) => {
            this.log.error(`WebSocket error for node ${nodeId}:`, error);
            this.handleDisconnection(nodeId);
        });
    }

    private handleDisconnection(nodeId: string) {
        this.metrics.recordDisconnection(nodeId);
        this.subscriptionHandler.removeSubscriber(nodeId);
        this.log.info(`Node ${nodeId} disconnected`);
    }

    private startConnectionMonitoring() {
        setInterval(() => {
            const now = Date.now();
            const subscribers = this.subscriptionHandler.getSubscribers();
            
            for (const [nodeId, info] of subscribers) {
                if (info.lastPong && now - info.lastPong > this.CONNECTION_TIMEOUT) {
                    this.log.warn(`Node ${nodeId} timed out`);
                    info.ws.terminate();
                    this.handleDisconnection(nodeId);
                }
            }
        }, this.CONNECTION_TIMEOUT);
    }

    addConnection(validatorAddress: string, ws: WebSocket) {
        this.connections.set(validatorAddress, ws);
    }

    removeConnection(validatorAddress: string) {
        this.connections.delete(validatorAddress);
    }
}