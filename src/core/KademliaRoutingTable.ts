import { NodeInfo } from '../types/registry.schema';

/**
 * KademliaRoutingTable — XOR-distance based node organization.
 */
export class KademliaRoutingTable {
    private buckets: NodeInfo[][] = [];
    private localNodeID: string;
    private bucketSize: number;
    public readonly k = 20;

    constructor(localNodeID: string, bucketSize = 20) {
        this.localNodeID = localNodeID;
        this.bucketSize = bucketSize;
        // Initialize 160 buckets for SHA-1/SHA-256 bits (or 256)
        for (let i = 0; i < 256; i++) {
            this.buckets[i] = [];
        }
    }

    addNode(info: NodeInfo): void {
        if (info.nodeID === this.localNodeID) return;

        const distance = this.getDistance(this.localNodeID, info.nodeID);
        const bucketIndex = this.getBucketIndex(distance);
        const bucket = this.buckets[bucketIndex];

        const existingIndex = bucket.findIndex(n => n.nodeID === info.nodeID);
        if (existingIndex !== -1) {
            bucket[existingIndex] = info; // Update
            // Move to end (most recently seen)
            const node = bucket.splice(existingIndex, 1)[0];
            bucket.push(node);
        } else if (bucket.length < this.bucketSize) {
            bucket.push(info);
        } else {
            // Bucket full - logic for pinging oldest would go here
        }
    }

    removeNode(nodeID: string): void {
        const distance = this.getDistance(this.localNodeID, nodeID);
        const bucketIndex = this.getBucketIndex(distance);
        const bucket = this.buckets[bucketIndex];
        const index = bucket.findIndex(n => n.nodeID === nodeID);
        if (index !== -1) {
            bucket.splice(index, 1);
        }
    }

    findClosestNodes(targetID: string, count: number): NodeInfo[] {
        const allNodes: { node: NodeInfo, distance: bigint }[] = [];
        for (const bucket of this.buckets) {
            for (const node of bucket) {
                allNodes.push({
                    node,
                    distance: this.getDistance(targetID, node.nodeID)
                });
            }
        }

        return allNodes
            .sort((a, b) => (a.distance < b.distance ? -1 : a.distance > b.distance ? 1 : 0))
            .slice(0, count)
            .map(item => item.node);
    }

    findNodesForService(serviceName: string, count: number): NodeInfo[] {
        // In a real DHT, we'd hash the service name to find the closest nodes
        // For now, we search our routing table
        const results: NodeInfo[] = [];
        for (const bucket of this.buckets) {
            for (const node of bucket) {
                if (node.services.some(s => s.name === serviceName || s.fullName === serviceName)) {
                    results.push(node);
                }
                if (results.length >= count) return results;
            }
        }
        return results;
    }

    private getDistance(id1: string, id2: string): bigint {
        // Simplified XOR distance: assuming IDs are hex strings
        // In production, we'd use SHA-256 hashes of the strings
        const b1 = BigInt('0x' + this.toHex(id1));
        const b2 = BigInt('0x' + this.toHex(id2));
        return b1 ^ b2;
    }

    private getBucketIndex(distance: bigint): number {
        if (distance === 0n) return 0;
        return distance.toString(2).length - 1;
    }

    private toHex(str: string): string {
        // Very basic string to hex converter for distance calculation
        let res = '';
        for (let i = 0; i < str.length; i++) {
            res += str.charCodeAt(i).toString(16);
        }
        return res.padEnd(64, '0').slice(0, 64);
    }
}
