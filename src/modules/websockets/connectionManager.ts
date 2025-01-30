import { WebSocket } from 'ws';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { Injectable } from '@nestjs/common';
import { SubscriptionHandler } from './subscriptionHandler';
import { Logger } from 'winston'

/**
 * Manages WebSocket connections and their lifecycle.
 * Handles connection monitoring, heartbeat checks, and disconnection cleanup.
 */
@Injectable()
export class ConnectionManager {
    /** Interval between ping messages (60 seconds) */
    private readonly HEARTBEAT_INTERVAL = 60000;
    /** Maximum time to wait for pong response before considering connection dead (65 seconds) */
    private readonly CONNECTION_TIMEOUT = 65000;
    private readonly log: Logger = WinstonUtil.newLog(ConnectionManager);
    /** Maps validator addresses to their WebSocket connections */
    private connections = new Map<string, WebSocket>();

    /**
     * Initializes the connection manager and starts connection monitoring.
     * @param subscriptionHandler - Handles subscriber management and updates
     */
    constructor(
        private readonly subscriptionHandler: SubscriptionHandler
    ) {
        this.startConnectionMonitoring();
    }

    /**
     * Sets up a new WebSocket connection with heartbeat monitoring.
     * Configures event handlers for pong responses, connection closure, and errors.
     * @param ws - WebSocket connection to initialize
     * @param nodeId - Unique identifier for the connected node
     */
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
            this.log.error('WebSocket connection error: %o', error);
            this.handleDisconnection(nodeId);
        });
    }

    /**
     * Handles node disconnection cleanup.
     * Removes the subscriber and logs the disconnection.
     * @param nodeId - Identifier of the disconnected node
     * @private
     */
    private handleDisconnection(nodeId: string) {
        this.subscriptionHandler.removeSubscriber(nodeId);
        this.log.info(`Node ${nodeId} disconnected`);
    }

    /**
     * Starts periodic monitoring of all connections.
     * Checks for timed-out connections and terminates them if necessary.
     * @private
     */
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

    /**
     * Adds a new validator connection to the connection map.
     * @param validatorAddress - Address of the validator
     * @param ws - WebSocket connection instance
     */
    addConnection(validatorAddress: string, ws: WebSocket) {
        this.connections.set(validatorAddress, ws);
    }

    /**
     * Removes a validator connection from the connection map.
     * @param validatorAddress - Address of the validator to remove
     */
    removeConnection(validatorAddress: string) {
        this.connections.delete(validatorAddress);
    }
}