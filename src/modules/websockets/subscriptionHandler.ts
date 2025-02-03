import { WebSocket } from 'ws';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { SubscriberInfo, SubscriptionRequest, SubscriptionResponse } from './types';
import { Injectable } from '@nestjs/common';

/**
 * Manages WebSocket subscriptions for validator nodes.
 * Handles subscription requests, validation, and subscriber lifecycle management.
 */
@Injectable()
export class SubscriptionHandler {
    /** Supported event types for subscriptions */
    private readonly EVENT_TYPES = {
        BLOCK: 'BLOCK'
    };
    private readonly log = WinstonUtil.newLog("SubscriptionHandler");
    /** Maps nodeId to subscriber information */
    private subscribers = new Map<string, SubscriberInfo>();

    /**
     * Processes a subscription request from a validator node.
     * Validates the request and sets up the subscription if valid.
     * @param ws - WebSocket connection instance
     * @param request - Subscription request containing nodeId, type, and events
     */
    async handleSubscriptionRequest(ws: WebSocket, request: SubscriptionRequest) {
        const { nodeId, nodeType, events } = request;

        if (!this.isValidSubscription(request)) {
            this.sendError(ws, 'Invalid subscription request');
            return;
        }

        const subscriberInfo: SubscriberInfo = {
            nodeId,
            nodeType,
            ws,
            subscriptions: new Set(events),
            connectedAt: Date.now()
        };

        this.subscribers.set(nodeId, subscriberInfo);
        await this.sendSubscriptionConfirmation(ws, events);
        this.log.info(`Node ${nodeId} subscribed to events: ${events.join(', ')}`);
    }

    /**
     * Returns all active subscribers.
     * @returns Map of nodeIds to subscriber information
     */
    getSubscribers(): Map<string, SubscriberInfo> {
        return this.subscribers;
    }

    /**
     * Removes a subscriber from the subscription list.
     * @param nodeId - Unique identifier of the node to remove
     */
    removeSubscriber(nodeId: string): void {
        if (this.subscribers.has(nodeId)) {
            this.subscribers.delete(nodeId);
            this.log.info(`Removed subscriber: ${nodeId}`);
        }
    }

    /**
     * Finds a subscriber by their WebSocket connection.
     * @param ws - WebSocket connection to search for
     * @returns Subscriber information and nodeId if found, undefined otherwise
     */
    findSubscriberByWebSocket(ws: WebSocket): { nodeId: string, info: SubscriberInfo } | undefined {
        for (const [nodeId, info] of this.subscribers.entries()) {
            if (info.ws === ws) {
                return { nodeId, info };
            }
        }
        return undefined;
    }

    /**
     * Updates the last pong timestamp for a subscriber.
     * Used for connection health monitoring.
     * @param nodeId - Identifier of the node to update
     */
    updateLastPong(nodeId: string) {
        const subscriber = this.subscribers.get(nodeId);
        if (subscriber) {
            subscriber.lastPong = Date.now();
        }
    }

    /**
     * Validates a subscription request.
     * Ensures the node type is VALIDATOR and all requested events are supported.
     * @param request - Subscription request to validate
     * @returns boolean indicating if the subscription is valid
     * @private
     */
    private isValidSubscription(request: SubscriptionRequest): boolean {
        return (
            request.nodeType === 'VALIDATOR' &&
            request.events.every(event => this.EVENT_TYPES[event])
        );
    }

    /**
     * Sends a subscription confirmation message to the client.
     * @param ws - WebSocket connection to send confirmation to
     * @param events - List of events the client is subscribed to
     * @private
     */
    private async sendSubscriptionConfirmation(ws: WebSocket, events: string[]) {
        const response: SubscriptionResponse = {
            type: 'SUBSCRIPTION_CONFIRMED',
            events,
            timestamp: Date.now()
        };

        ws.send(JSON.stringify(response));
    }

    /**
     * Sends an error message to the client.
     * @param ws - WebSocket connection to send error to
     * @param message - Error message to send
     * @private
     */
    private sendError(ws: WebSocket, message: string) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message,
            timestamp: Date.now()
        }));
    }
}