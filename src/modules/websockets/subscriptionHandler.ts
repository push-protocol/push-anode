import { WebSocket } from 'ws';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { SubscriberInfo, SubscriptionRequest, SubscriptionResponse } from './types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SubscriptionHandler {
    private readonly EVENT_TYPES = {
        BLOCK_STORED: 'BLOCK_STORED',
        BLOCK_ERROR: 'BLOCK_ERROR'
    };
    private readonly log = WinstonUtil.newLog("SubscriptionHandler");
    private subscribers = new Map<string, SubscriberInfo>();

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

    getSubscribers(): Map<string, SubscriberInfo> {
        return this.subscribers;
    }

    removeSubscriber(nodeId: string): void {
        if (this.subscribers.has(nodeId)) {
            this.subscribers.delete(nodeId);
            this.log.info(`Removed subscriber: ${nodeId}`);
        }
    }

    findSubscriberByWebSocket(ws: WebSocket): { nodeId: string, info: SubscriberInfo } | undefined {
        for (const [nodeId, info] of this.subscribers.entries()) {
            if (info.ws === ws) {
                return { nodeId, info };
            }
        }
        return undefined;
    }

    updateLastPong(nodeId: string) {
        const subscriber = this.subscribers.get(nodeId);
        if (subscriber) {
            subscriber.lastPong = Date.now();
        }
    }

    private isValidSubscription(request: SubscriptionRequest): boolean {
        return (
            request.nodeType === 'VALIDATOR' &&
            request.events.every(event => this.EVENT_TYPES[event])
        );
    }

    private async sendSubscriptionConfirmation(ws: WebSocket, events: string[]) {
        const response: SubscriptionResponse = {
            type: 'SUBSCRIPTION_CONFIRMED',
            events,
            timestamp: Date.now()
        };

        ws.send(JSON.stringify(response));
    }

    private sendError(ws: WebSocket, message: string) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message,
            timestamp: Date.now()
        }));
    }
}