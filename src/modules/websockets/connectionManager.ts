import { WebSocket } from 'ws';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { MetricsService } from './metricsService';
import { SubscriberInfo } from './types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConnectionManager {
    private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
    private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds
    private readonly log = WinstonUtil.newLog("ConnectionManager");
    private subscribers = new Map<string, SubscriberInfo>();

    constructor(
        private readonly metrics: MetricsService
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
            const subscriber = this.subscribers.get(nodeId);
            if (subscriber) {
                subscriber.lastPong = Date.now();
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
        this.subscribers.delete(nodeId);
        this.metrics.recordDisconnection(nodeId);
        this.log.info(`Node ${nodeId} disconnected`);
    }

    private startConnectionMonitoring() {
        setInterval(() => {
            const now = Date.now();
            for (const [nodeId, info] of this.subscribers) {
                if (info.lastPong && now - info.lastPong > this.CONNECTION_TIMEOUT) {
                    this.log.warn(`Node ${nodeId} timed out`);
                    info.ws.terminate();
                    this.handleDisconnection(nodeId);
                }
            }
        }, this.CONNECTION_TIMEOUT);
    }
}