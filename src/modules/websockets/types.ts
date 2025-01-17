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

export interface BlockStoredEvent {
    type: 'BLOCK_STORED';
    data: {
        block_hash: string;
        data_as_json: any;
        data: Buffer;
        ts: number;
    };
}

export interface ErrorResponse {
    type: 'ERROR';
    message: string;
    timestamp: number;
}

export interface Block {
    hash: string;
    height: number;
    transactions: any[]; // adjust this type based on your transaction structure
}

export interface HeartbeatMessage {
    type: 'PING' | 'PONG';
    timestamp: number;
}

export type WSMessageType = 
    | 'SUBSCRIBE' 
    | 'SUBSCRIPTION_CONFIRMED'
    | 'BLOCK_STORED'
    | 'ERROR'
    | 'PING'
    | 'PONG'
    | 'HEARTBEAT';

export interface WSMessage {
    type: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'MESSAGE';
    nodeId: string;
    signature: string;
}