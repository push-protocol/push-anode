import { WinstonUtil } from '../../utilz/winstonUtil';
import { BlockStoredEvent } from './types';
import { SubscriptionHandler } from './subscriptionHandler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EventBroadcaster {
    private readonly log = WinstonUtil.newLog('EventBroadcaster');

    constructor(
        private readonly subscriptionHandler: SubscriptionHandler
    ) {}

    async broadcast(event: BlockStoredEvent) {
        const subscribers = this.subscriptionHandler.getSubscribers();
        
         // Log subscribers
        this.log.debug('Current subscribers:', {
          count: subscribers.size,
          subscribers: Array.from(subscribers).map(([nodeId, info]) => ({
              nodeId,
              subscriptions: Array.from(info.subscriptions),
              wsReadyState: info.ws.readyState
          }))
        });

        for (const [nodeId, info] of subscribers) {
            if (info.subscriptions.has('BLOCK_STORED')) {
              try {
                info.ws.send(JSON.stringify(event));
                this.log.debug(`Event ${event.type} sent to node ${nodeId}`);
              } catch (error) {
                this.log.error(`Failed to send event to node ${nodeId}:`, error);
              }
            }
        }

        this.log.debug(`Broadcasted event ${event.type} to ${subscribers.size} subscribers`);
    }
}