import { WebSocket } from 'ws';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { ErrorResponse } from './types';
import { Injectable } from '@nestjs/common';
import { Logger } from 'winston'

/**
 * Handles WebSocket-related errors and error responses.
 * Provides centralized error handling for connection, subscription, and message validation issues.
 */
@Injectable()
export class ErrorHandler {
    private readonly log: Logger = WinstonUtil.newLog(ErrorHandler);

    constructor() {}

    /**
     * Handles WebSocket connection-related errors.
     * Logs the error and sends an error response to the client.
     * @param ws - WebSocket connection instance
     * @param error - Error that occurred during connection
     */
    async handleConnectionError(ws: WebSocket, error: Error) {
        this.log.error('WebSocket connection error: %o', error);
        this.sendError(ws, 'Connection error occurred');
    }

    /**
     * Handles subscription-related errors for a specific node.
     * Logs the error with node context and sends an error response.
     * @param ws - WebSocket connection instance
     * @param nodeId - Identifier of the node experiencing the error
     * @param error - Subscription-related error
     */
    async handleSubscriptionError(ws: WebSocket, nodeId: string, error: Error) {
        this.log.error(`Subscription error for node ${nodeId}: %o`, error);
        this.sendError(ws, 'Subscription error occurred');
    }

    /**
     * Handles invalid message errors.
     * Logs the invalid message and sends an error response to the client.
     * @param ws - WebSocket connection instance
     * @param message - Invalid message content or error description
     */
    handleInvalidMessage(ws: WebSocket, message: string) {
        this.log.warn(`Invalid message received: %o`, message);
        this.sendError(ws, message);
    }

    /**
     * Sends an error response to the client if the connection is open.
     * @param ws - WebSocket connection instance
     * @param message - Error message to send to the client
     * @private
     */
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