import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
    recordDisconnection(nodeId: string) {
        // Implement metrics recording logic here
    }

    async recordConnectionError(error: Error): Promise<void> {
        // Add your metrics recording logic here
    }

    async recordSubscriptionError(nodeId: string, error: Error): Promise<void> {
        // Add your metrics recording logic here
    }

    async recordEventSent(eventType: string): Promise<void> {
        // Add your metrics recording logic here
    }

    async recordEventError(nodeId: string, error: Error): Promise<void> {
        // Add your metrics recording logic here
    }
}