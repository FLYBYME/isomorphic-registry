import { NodeInfo, ServiceInfo, ActionInfo, EventInfo } from './registry.schema';

/**
 * Mesh registries - extended by domain services via module augmentation.
 */
export interface MeshActionRegistry { [key: string]: any }
export interface MeshEventRegistry { [key: string]: any }

/**
 * IMeshTransceiver - baseline interface for components that can call/emit on the mesh.
 */
export interface IMeshTransceiver {
  call<
    TAction extends keyof MeshActionRegistry, 
    TParams extends MeshActionRegistry[TAction] extends { params: infer P } ? P : any,
    TReturn extends MeshActionRegistry[TAction] extends { returns: infer R } ? R : any
  >(action: TAction, params: TParams): Promise<TReturn>;

  emit<
    TEvent extends keyof MeshEventRegistry,
    TPayload extends MeshEventRegistry[TEvent]
  >(event: TEvent, payload: TPayload): void;
}


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
