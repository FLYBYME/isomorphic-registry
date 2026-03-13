import { ServiceSchema, IServiceInstance, ServiceState, ILogger } from '../types/registry.types';

/**
 * ServiceInitializer — creates a service instance from a schema.
 */
export class ServiceInitializer {
    static createInstance(schema: ServiceSchema, logger: ILogger): IServiceInstance {
        const fullName = schema.version ? `v${schema.version}.${schema.name}` : schema.name;
        
        const instance: IServiceInstance = {
            name: schema.name,
            fullName,
            version: schema.version,
            schema,
            state: 'initializing',

            async start() {
                this.state = 'starting';
                if (schema.started) await schema.started();
                this.state = 'running';
            },

            async stop() {
                this.state = 'stopping';
                if (schema.stopped) await schema.stopped();
                this.state = 'stopped';
            }
        };

        if (schema.created) schema.created();

        return instance;
    }
}
