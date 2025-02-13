import { WinstonUtil } from '../../utilz/winstonUtil';
import { BlockEvent } from './types';
import { SubscriptionHandler } from './subscriptionHandler';
import { Injectable } from '@nestjs/common';
import { Logger } from 'winston'

/**
 * Handles broadcasting of blockchain events to subscribed validator nodes.
 * Manages the distribution of block events to all valid subscribers while
 * handling connection errors and maintaining detailed logging.
 */
@Injectable()
export class EventBroadcaster {
    private readonly log = WinstonUtil.newLog(EventBroadcaster);

    /**
     * Initializes the broadcaster with required dependencies.
     * @param subscriptionHandler - Manages subscriber information and subscriptions
     */
    constructor(
        private readonly subscriptionHandler: SubscriptionHandler
    ) {}

    /**
     * Broadcasts a block event to all subscribed nodes.
     * Logs detailed subscriber information and handles transmission errors.
     * @param event - Block event to broadcast to subscribers
     * @returns Promise that resolves when broadcasting is complete
     */
    async broadcast(event: BlockEvent) {
        const subscribers = this.subscriptionHandler.getSubscribers();
        
        // Log detailed subscriber information for debugging
        this.log.debug(`Current subscribers: %o`, {
          count: subscribers.size,
          subscribers: Array.from(subscribers).map(([nodeId, info]) => ({
              nodeId,
              subscriptions: Array.from(info.subscriptions),
              wsReadyState: info.ws.readyState
          }))
        });

        // Broadcast to each subscribed node
        for (const [nodeId, info] of subscribers) {
            if (info.subscriptions.has('BLOCK')) {
              try {
                info.ws.send(JSON.stringify(event));
                this.log.debug(`Event ${event.type} sent to node ${nodeId}`);
              } catch (error) {
                this.log.error(`Failed to send event to node ${nodeId}: %o`, error);
              }
            }
        }

        this.log.debug(`Broadcasted event ${event.type} to ${subscribers.size} subscribers`);
    }
}