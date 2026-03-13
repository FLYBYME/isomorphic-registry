import { ServiceRegistry } from '../src/core/ServiceRegistry';
import { ServiceLifecycle } from '../src/core/ServiceLifecycle';
import { ServiceInitializer } from '../src/core/ServiceInitializer';
import { ILogger } from '../src/types/registry.types';
import { NodeInfo } from '../src/types/registry.schema';

describe('ServiceLifecycle', () => {
    let registry: ServiceRegistry;
    let lifecycle: ServiceLifecycle;
    let mockLogger: any;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            child: jest.fn().mockReturnThis()
        };
        registry = new ServiceRegistry('local', mockLogger);
        lifecycle = new ServiceLifecycle(registry, mockLogger);
    });

    const createNode = (id: string, services: string[] = []): NodeInfo => ({
        nodeID: id,
        type: 'worker',
        namespace: 'default',
        addresses: [],
        services: services.map(s => ({ name: s })),
        nodeSeq: 1,
        hostname: 'h',
        timestamp: Date.now(),
        available: true,
        trustLevel: 'public',
        metadata: {},
        capabilities: {},
        pid: 0
    });

    test('should pause service when dependencies missing', async () => {
        const paused = jest.fn();
        const resumed = jest.fn();
        
        const schema = {
            name: 's1',
            dependencies: ['dep1'],
            paused,
            resumed
        };

        const instance = ServiceInitializer.createInstance(schema, mockLogger);
        lifecycle.registerService(instance);
        await instance.start();
        expect(instance.state).toBe('running');

        // Trigger evaluation by registering another node (without dep1)
        registry.registerNode(createNode('n2'));

        // Wait for potential async calls
        await new Promise(r => setTimeout(r, 50));

        expect(instance.state).toBe('paused');
        expect(paused).toHaveBeenCalled();

        // Restore dependency
        registry.registerNode(createNode('n3', ['dep1']));

        await new Promise(r => setTimeout(r, 50));
        expect(instance.state).toBe('running');
        expect(resumed).toHaveBeenCalled();
    });
});
