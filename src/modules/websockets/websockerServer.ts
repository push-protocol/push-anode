import { WebSocket, WebSocketServer } from 'ws';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { SubscriptionHandler } from './subscriptionHandler';
import { ConnectionManager } from './connectionManager';
import { ErrorHandler } from './errorHandler';
import { WSMessage } from './types';
import { Server } from 'http';
import { randomBytes } from 'crypto';
import { INestApplication, Injectable } from '@nestjs/common';
import { OnApplicationShutdown } from '@nestjs/common';
import { ValidatorContractState } from '../validator/validator-contract-state.service';
import { EthUtil } from '../../utilz/ethUtil';
import { BitUtil } from '../../utilz/bitUtil';
import IdUtil from '../../utilz/idUtil';
/**
 * WebSocket server implementation for Archive Node connections.
 * Handles validator authentication, subscriptions, and real-time event broadcasting.
 * Implements secure connection handling with nonce-based authentication.
 */
@Injectable()
export class ArchiveNodeWebSocketServer implements OnApplicationShutdown {
    private wss: WebSocketServer;
    private readonly log = WinstonUtil.newLog(ArchiveNodeWebSocketServer);
    /** Maps validator addresses to their authentication nonces */
    private nonceMap: Map<string, string> = new Map();

    /**
     * Initializes the WebSocket server with required dependencies.
     * @param subscriptionHandler - Manages validator subscriptions
     * @param connectionManager - Handles active WebSocket connections
     * @param errorHandler - Handles WebSocket errors
     * @param validatorContractState - Validates validator status
     */
    constructor(
        private readonly subscriptionHandler: SubscriptionHandler,
        private readonly connectionManager: ConnectionManager,
        private readonly errorHandler: ErrorHandler,
        private readonly validatorContractState: ValidatorContractState
    ) {}

    /**
     * Initializes the WebSocket server with the NestJS application.
     * Sets up connection handling, authentication, and message processing.
     * @param app - NestJS application instance
     * @throws Error if app or HTTP server is not available
     */
    async initialize(app: INestApplication) {
        if (!app) {
            throw new Error('NestJS application instance is required');
        }

        const server: Server = app.getHttpServer();
        if (!server) {
            throw new Error('HTTP server not found in NestJS application');
        }

        try {
            this.wss = new WebSocketServer({ 
                server,
                verifyClient: (info, callback) => {
                    // Accept initial connection without verification
                    callback(true);
                }
            });
            
            this.wss.on('connection', (ws: WebSocket, req: any) => {
                const validatorAddress = req.headers['validator-address'];
                
                // Set up authentication timeout
                const authTimeout = setTimeout(() => {
                    if (this.nonceMap.has(validatorAddress)) {
                        this.log.warn(`Authentication timeout for ${validatorAddress}`);
                        ws.close(4001, 'Authentication timeout');
                        this.nonceMap.delete(validatorAddress);
                    }
                }, 30000); // 30 seconds timeout

                // Generate and send nonce immediately
                const nonce = IdUtil.generateNonce();
                this.nonceMap.set(validatorAddress, nonce);
                this.log.info(`Sending auth challenge to ${validatorAddress}: ${nonce}`);
                ws.send(JSON.stringify({ type: 'AUTH_CHALLENGE', nonce }));

                // Handle messages
                ws.on('message', async (data: Buffer) => {
                    try {
                        const message = JSON.parse(data.toString());
                        
                        // Handle health check
                        if (message.type === 'HEALTH_CHECK') {
                            this.log.info(`Received health check from ${validatorAddress}: ${message.timestamp}`);
                            ws.send(JSON.stringify({
                                type: 'HEALTH_CHECK_RESPONSE',
                                timestamp: message.timestamp
                            }));
                            this.log.info(`Sending health check response to ${validatorAddress}: ${message.timestamp}`);
                            ws.close(1000, 'Health check complete');
                            clearTimeout(authTimeout);
                            this.nonceMap.delete(validatorAddress);
                            return;
                        }

                        // Handle auth response
                        if (message.type === 'AUTH_RESPONSE') {
                            const { signature, validatorAddress: claimedAddress, nonce: receivedNonce } = message;
                            const storedNonce = this.nonceMap.get(claimedAddress);

                            if (!storedNonce || storedNonce !== receivedNonce) {
                                throw new Error('Invalid nonce');
                            }

                            // Recover address from signature
                            const recoveredAddress = await EthUtil.recoverAddressFromMsg(
                                BitUtil.base16ToBytes(storedNonce),
                                BitUtil.base16ToBytes(signature)
                            );

                            // Verify recovered address matches claimed address
                            if (recoveredAddress.toLowerCase() !== claimedAddress.toLowerCase()) {
                                throw new Error('Signature verification failed');
                            }

                            // Verify validator in contract
                            const isValid = await this.validatorContractState.isActiveValidator(recoveredAddress);
                            if (!isValid) {
                                throw new Error('Not an active validator');
                            }

                            this.log.info(`Authentication successful for ${validatorAddress}`);

                            // Cleanup and proceed
                            clearTimeout(authTimeout);
                            this.nonceMap.delete(claimedAddress);

                            // Proceed with connection
                            this.handleNewConnection(ws, claimedAddress);
                            this.log.info(`Connection established for ${validatorAddress}. Sending AUTH_SUCCESS`);
                            ws.send(JSON.stringify({ type: 'AUTH_SUCCESS' }));
                        }
                    } catch (error) {
                        this.log.warn(`Message processing failed for ${validatorAddress}: ${error.message}`);
                        ws.close(4003, 'Message processing failed');
                        this.nonceMap.delete(validatorAddress);
                        clearTimeout(authTimeout);
                    }
                });
            });

            const addr = server.address();
            const port = typeof addr === 'string' ? addr : addr?.port;
            this.log.info(`WebSocket Server listening on port: ${port}`);

        } catch (error) {
            this.log.error('Failed to initialize WebSocket server: %o', error);
            throw error;
        }
    }

    /**
     * Handles new authenticated WebSocket connections.
     * Sets up message handlers and error handling for the connection.
     * @param ws - WebSocket connection instance
     * @param validatorAddress - Authenticated validator's address
     * @private
     */
    private handleNewConnection(ws: WebSocket, validatorAddress: string) {
        this.log.info(`New connection from validator: ${validatorAddress}`);
        
        // Add connection to manager
        this.connectionManager.addConnection(validatorAddress, ws);
        
        ws.on('message', async (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString()) as WSMessage;
                
                if (message.type === 'SUBSCRIBE') {
                    if (message.nodeId !== validatorAddress) {
                        this.log.warn(`Message nodeId mismatch for ${validatorAddress}`);
                        ws.close(1008, 'Invalid nodeId');
                        return;
                    }
                }
                await this.handleMessage(ws, message);
            } catch (error) {
                this.errorHandler.handleConnectionError(ws, error);
            }
        });

        ws.on('error', (error) => {
            this.log.error(`WebSocket error for ${validatorAddress}: %o`, error);
            this.errorHandler.handleConnectionError(ws, error);
        });

        ws.on('close', () => {
            this.log.info(`Connection closed for validator: ${validatorAddress}`);
            this.connectionManager.removeConnection(validatorAddress);
        });
    }

    /**
     * Handles graceful shutdown of the WebSocket server.
     * Closes all active connections and shuts down the server.
     */
    async onApplicationShutdown() {
        const subscribers = this.subscriptionHandler.getSubscribers();

        // Close all connections
        for (const [nodeId, info] of subscribers) {
            info.ws.close();
        }
        
        if (this.wss) {
            await new Promise<void>((resolve) => this.wss.close(() => resolve()));
        }
    }

    /**
     * Processes incoming WebSocket messages.
     * Handles subscription requests and validates node status.
     * @param ws - WebSocket connection instance
     * @param message - Parsed WebSocket message
     * @private
     */
    private async handleMessage(ws: WebSocket, message: WSMessage) {
        switch (message.type) {
            case 'SUBSCRIBE':
                if ('nodeType' in message && 'events' in message) {
                    // Validate if the node is active
                    if (!this.validatorContractState.isActiveValidator(message.nodeId)) {
                        throw new Error('Invalid validator node');
                    }
                    
                    await this.subscriptionHandler.handleSubscriptionRequest(ws, {
                        ...message,
                        type: 'SUBSCRIBE',
                        nodeType: 'VALIDATOR' as const,
                        events: message.events as string[]
                    });
                } else {
                    this.errorHandler.handleInvalidMessage(ws, 'Invalid subscription request format');
                }
                break;
            default:
                this.errorHandler.handleInvalidMessage(ws, 'Unknown message type');
        }
    }
}