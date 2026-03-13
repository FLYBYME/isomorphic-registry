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

export interface Context<TParams = unknown, TMeta = Record<string, unknown>> {
    readonly id: string;
    readonly actionName: string;
    readonly params: TParams;
    readonly meta: TMeta;
    readonly correlationId: string;
    readonly callerID: string | null;
    readonly nodeID: string;

    call<TResult = unknown>(action: string, params: unknown): Promise<TResult>;
    emit(event: string, payload: unknown): void;
}

export interface ActionSchema<TParams = Record<string, unknown>, TResult = unknown> extends ActionInfo {
    handler: (ctx: Context<TParams>) => Promise<TResult> | TResult;
}

export interface EventSchema<TParams = Record<string, unknown>> extends EventInfo {
    handler: (ctx: Context<TParams>) => void | Promise<void>;
}

export interface ServiceSchema {
    name: string;
    version?: string | number;
    settings?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    actions?: Record<string, ActionSchema<any, any> | ((ctx: Context<any>) => any)>;
    events?: Record<string, EventSchema<any> | ((ctx: Context<any>) => void | Promise<void>)>;
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
