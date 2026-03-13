import { BaseBalancer } from './BaseBalancer';
import { NodeInfo } from '../types/registry.schema';

/**
 * RoundRobinBalancer — cycles through nodes in sequential order.
 */
export class RoundRobinBalancer extends BaseBalancer {
    private counters = new Map<string, number>();

    select(nodes: NodeInfo[], ctx?: Record<string, unknown>): NodeInfo | null {
        if (nodes.length === 0) return null;
        if (nodes.length === 1) return nodes[0];

        const key = ctx?.action as string || 'default';
        const counter = (this.counters.get(key) ?? 0) % nodes.length;
        this.counters.set(key, counter + 1);

        return nodes[counter];
    }
}
