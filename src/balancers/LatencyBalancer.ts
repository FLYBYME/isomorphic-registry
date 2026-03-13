import { BaseBalancer } from './BaseBalancer';
import { NodeInfo } from '../types/registry.schema';

/**
 * LatencyBalancer — selects nodes with the lowest recorded latency.
 */
export class LatencyBalancer extends BaseBalancer {
    public latencies = new Map<string, number>();

    recordLatency(nodeID: string, ms: number): void {
        const current = this.latencies.get(nodeID) ?? ms;
        // Moving average (alpha = 0.2)
        this.latencies.set(nodeID, (current * 0.8) + (ms * 0.2));
    }

    select(nodes: NodeInfo[], _ctx?: Record<string, unknown>): NodeInfo | null {
        if (nodes.length === 0) return null;

        let bestNode = nodes[0];
        let minLatency = this.latencies.get(bestNode.nodeID) ?? 9999;

        for (let i = 1; i < nodes.length; i++) {
            const lat = this.latencies.get(nodes[i].nodeID) ?? 9999;
            if (lat < minLatency) {
                minLatency = lat;
                bestNode = nodes[i];
            }
        }

        return bestNode;
    }
}
