import { EventEmitter } from 'eventemitter3';
import { NodeInfo, ServiceInfo } from '../types/registry.schema';
import { ILogger } from '../types/registry.types';
import { BaseBalancer } from '../balancers/BaseBalancer';
import { RoundRobinBalancer } from '../balancers/RoundRobinBalancer';
import { KademliaRoutingTable } from './KademliaRoutingTable';

/**
 * ServiceRegistry — tracks all known nodes and their services.
 */
export class ServiceRegistry extends EventEmitter {
    private nodes = new Map<string, NodeInfo>();
    private dht: KademliaRoutingTable | null = null;
    private balancer: BaseBalancer;
    private preferLocal: boolean;
    private localNodeID: string;
    private dhtEnabled: boolean;

    constructor(
        localNodeID: string,
        private logger: ILogger,
        options: {
            balancer?: BaseBalancer;
            preferLocal?: boolean;
            dht?: { enabled?: boolean; bucketSize?: number };
        } = {}
    ) {
        super();
        this.localNodeID = localNodeID;
        this.balancer = options.balancer ?? new RoundRobinBalancer();
        this.preferLocal = options.preferLocal ?? true;
        this.dhtEnabled = options.dht?.enabled ?? false;

        if (this.dhtEnabled) {
            this.dht = new KademliaRoutingTable(localNodeID, options.dht?.bucketSize ?? 20);
        }
    }

    /**
     * Register or update a node's info.
     */
    registerNode(info: NodeInfo): void {
        const existing = this.nodes.get(info.nodeID);
        if (existing) {
            const existingSeq = existing.nodeSeq ?? 0;
            const incomingSeq = info.nodeSeq ?? 0;
            if (incomingSeq < existingSeq) return;
        }
        
        this.nodes.set(info.nodeID, info);
        if (this.dht) this.dht.addNode(info);

        this.emit('node:registered', info);
        this.emit('changed');
    }

    /** Remove a node from the registry */
    unregisterNode(nodeID: string): void {
        const node = this.nodes.get(nodeID);
        if (node) {
            this.nodes.delete(nodeID);
            if (this.dht) this.dht.removeNode(nodeID);
            this.emit('node:unregistered', node);
            this.emit('changed');
        }
    }

    /** Update a node's heartbeat */
    heartbeat(nodeID: string, payload?: { cpu?: number; activeRequests?: number }): void {
        const node = this.nodes.get(nodeID);
        if (node) {
            const wasAvailable = node.available;
            node.available = true;
            node.lastHeartbeatTime = Date.now();

            if (payload) {
                if (payload.cpu !== undefined) node.cpu = payload.cpu;
                if (payload.activeRequests !== undefined) node.activeRequests = payload.activeRequests;
                
                // Simple health score
                let score = 1.0;
                score -= ((node.cpu ?? 0) / 100) * 0.4;
                if ((node.activeRequests ?? 0) > 50) score -= 0.3;
                node.healthScore = Math.max(0, Math.min(1, score));
            }

            if (!wasAvailable) {
                this.emit('node:recovered', node);
                this.emit('changed');
            }
        }
    }

    getNode(nodeID: string): NodeInfo | undefined {
        return this.nodes.get(nodeID);
    }

    getNodes(): NodeInfo[] {
        return Array.from(this.nodes.values());
    }

    getAvailableNodes(): NodeInfo[] {
        return this.getNodes().filter(n => n.available);
    }

    getNodesWithCapability(capability: string): NodeInfo[] {
        return this.getAvailableNodes().filter(n => n.capabilities && n.capabilities[capability]);
    }

    findNodesForAction(actionName: string): NodeInfo[] {
        if (this.dht) {
            const candidates = this.dht.findNodesForService(actionName.split('.')[0], this.dht.k);
            if (candidates.length > 0) return candidates;
        }

        return this.getAvailableNodes().filter(node =>
            node.services.some(svc => {
                const svcName = svc.fullName || svc.name;
                return (svc.actions && Object.keys(svc.actions).some(k => k === actionName || `${svcName}.${k}` === actionName));
            })
        );
    }

    selectNode(actionName: string, ctx?: Record<string, unknown>): NodeInfo | null {
        const candidates = this.findNodesForAction(actionName);
        if (candidates.length === 0) return null;

        if (this.preferLocal) {
            const local = candidates.find(n => n.nodeID === this.localNodeID);
            if (local) return local;
        }

        if (this.dht) return candidates[0];

        return this.balancer.select(candidates, ctx);
    }

    getServiceNames(): string[] {
        const names = new Set<string>();
        for (const node of this.nodes.values()) {
            if (node.available) {
                for (const svc of node.services) {
                    names.add(svc.fullName || svc.name);
                }
            }
        }
        return Array.from(names);
    }

    setBalancer(balancer: BaseBalancer): void {
        this.balancer = balancer;
    }
}
