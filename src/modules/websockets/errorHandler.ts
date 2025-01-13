import { WebSocket } from 'ws';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { MetricsService } from './metricsService';
import { ErrorResponse } from './types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ErrorHandler {
    private readonly log = WinstonUtil.newLog("ErrorHandler");

    constructor(
        private readonly metrics: MetricsService
    ) {}

    async handleConnectionError(ws: WebSocket, error: Error) {
        this.log.error('WebSocket connection error:', error);
        await this.metrics.recordConnectionError(error);
        this.sendError(ws, 'Connection error occurred');
    }

    async handleSubscriptionError(ws: WebSocket, nodeId: string, error: Error) {
        this.log.error(`Subscription error for node ${nodeId}:`, error);
        await this.metrics.recordSubscriptionError(nodeId, error);
        this.sendError(ws, 'Subscription error occurred');
    }

    handleInvalidMessage(ws: WebSocket, message: string) {
        this.log.warn('Invalid message received:', message);
        this.sendError(ws, message);
    }

    private sendError(ws: WebSocket, message: string) {
        if (ws.readyState === WebSocket.OPEN) {
            const errorResponse: ErrorResponse = {
                type: 'ERROR',
                message,
                timestamp: Date.now()
            };
            ws.send(JSON.stringify(errorResponse));
        }
    }
}