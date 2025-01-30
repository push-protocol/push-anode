import { WebSocket } from 'ws';

export interface SubscriberInfo {
    nodeId: string;
    nodeType: 'VALIDATOR';
    ws: WebSocket;
    subscriptions: Set<string>;
    connectedAt: number;
    lastPong?: number;
}

export interface SubscriptionRequest {
    type: 'SUBSCRIBE';
    nodeId: string;
    nodeType: 'VALIDATOR';
    events: string[];
}

export interface SubscriptionResponse {
    type: 'SUBSCRIPTION_CONFIRMED';
    events: string[];
    timestamp: number;
}

export interface FilteredTxData {
    blockHash: string;
    txHash: string;
    category: string;
    from: string;
    recipients: string[];
}
  
export interface FilterBlockResponse {
    blockHash: string;
    txs: FilteredTxData[];
}

export interface BlockEvent {
    type: 'BLOCK';
    data: FilterBlockResponse;
}

export interface ErrorResponse {
    type: 'ERROR';
    message: string;
    timestamp: number;
}

export interface HeartbeatMessage {
    type: 'PING' | 'PONG';
    timestamp: number;
}

export interface SubscribeAckResponse {
    type: 'SUBSCRIBE_ACK';
    data: {
        block: FilterBlockResponse | null;
        subscriptionId: string;
        matchedFilter: any[];  // adjust this type based on your filter structure
        success: boolean;
        error?: string;
    };
    timestamp: number;
}

export type WSMessageType = 
    | 'SUBSCRIBE' 
    | 'SUBSCRIPTION_CONFIRMED'
    | 'BLOCK'
    | 'ERROR'
    | 'PING'
    | 'PONG'
    | 'HEARTBEAT'
    | 'SUBSCRIBE_ACK';

export interface WSMessage {
    type: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'MESSAGE';
    nodeId: string;
    signature: string;
}