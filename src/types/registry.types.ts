import { NodeInfo, ServiceInfo, ActionInfo, EventInfo } from './registry.schema';

export interface ILogger {
    debug(msg: string, data?: Record<string, unknown>): void;
    info(msg: string, data?: Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, data?: Record<string, unknown>): void;
    child(context: Record<string, unknown>): ILogger;
}

export type ServiceState =
    | 'initializing'
    | 'starting'
    | 'running'
    | 'stopping'
    | 'stopped'
    | 'errored'
    | 'pending_config'
    | 'pausing'
    | 'paused';

export interface ActionSchema<TParams = Record<string, unknown>, TResult = unknown> extends ActionInfo {
    handler: (ctx: IExecutionContext<TParams>) => Promise<TResult> | TResult;
}

export interface EventSchema<TParams = Record<string, unknown>> extends EventInfo {
    handler: (ctx: IExecutionContext<TParams>) => void | Promise<void>;
}

export interface IExecutionContext<TParams = Record<string, unknown>> {
    params: TParams;
    meta: Record<string, unknown>;
    nodeID: string;
    action?: string;
    event?: string;
    caller?: string;
}

export interface ServiceSchema {
    name: string;
    version?: string | number;
    settings?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    actions?: Record<string, ActionSchema<any, any> | ((ctx: IExecutionContext<any>) => any)>;
    events?: Record<string, EventSchema<any> | ((ctx: IExecutionContext<any>) => void | Promise<void>)>;
    methods?: Record<string, (...args: any[]) => any>;
    dependencies?: string[];

    // Lifecycle Hooks
    created?: () => void | Promise<void>;
    started?: () => void | Promise<void>;
    stopped?: () => void | Promise<void>;
    paused?: () => void | Promise<void>;
    resumed?: () => void | Promise<void>;
}

export interface IServiceInstance {
    readonly name: string;
    readonly fullName: string;
    readonly version?: string | number;
    readonly schema: ServiceSchema;
    state: ServiceState;
    
    start(): Promise<void>;
    stop(): Promise<void>;
}
