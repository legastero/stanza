interface HookRegistration {
    handler: HookHandler<any>;
    destroy?: boolean;
    priority: number;
}

export type HookHandler<T extends object> = (
    event: HookEvent<T>
) => void | Promise<void | HookEvent<T>>;
export type Logger = (level: string, format: string, args: any[]) => void;

export class HookEvent<T extends object> {
    /**
     * Provided data object for the event.
     *
     * Any changes made to the data object will be visible to any
     * subsequent event handlers, and to the original event initiator
     * once all handlers have run.
     */
    public data: T;

    /**
     * The name of the event.
     */
    public name: string;

    // These properties are "public", but are only exposed for use
    // by the HookEmitter class.
    public _stopped: boolean = false;
    public _destroy: boolean = false;
    public _destroyHandler: boolean = false;

    constructor(name: string, data: T) {
        this.name = name;
        this.data = data;
    }

    /**
     * Prevent running any remaining event handlers.
     */
    public stopPropagation(): void {
        this._stopped = true;
    }

    /**
     * Mark the entire hook and any registered handlers to be destroyed after running.
     */
    public destroyHook(): void {
        this._destroy = true;
    }

    /**
     * Mark the currently executing event handler to be destroyed after running.
     */
    public destroyHandler(): void {
        this._destroyHandler = true;
    }
}

export class HookEmitter {
    private logger?: Logger;
    private hooks: Map<string, HookRegistration[]>;

    constructor() {
        this.hooks = new Map();
    }

    public registerLogger(logger: Logger): void {
        this.logger = logger;
    }

    public log(level: string, format: string, ...args: any[]): void {
        if (this.logger) {
            this.logger(level, format, args);
        } else if (level === 'error') {
            console.error(format, ...args);
        }
    }

    /**
     * Check if any handlers have been registered for a given hook.
     *
     * @param name The hook name
     */
    public hookExists(name: string): boolean {
        const hooks = this.hooks.get(name) || [];
        return hooks.length > 0;
    }

    /**
     * Add a new handler for a hook.
     *
     * Handlers may be given a priority value to make them run sooner or later in the event
     * processing chain.
     *
     * Event handlers are executed serially, based on their priority (highest priority runs first).
     *
     * @param name The name of the hook.
     * @param handler The event handler function.
     * @param priority Optional priority value to control where in the chain the handler will run.
     */
    public on<T extends object>(name: string, handler: HookHandler<T>, priority: number = 0): void {
        const hooks = this.hooks.get(name) || [];

        hooks.push({
            handler,
            priority
        });

        hooks.sort((a, b) => a.priority - b.priority);

        this.hooks.set(name, hooks);
    }

    /**
     * Remove one or more handlers for a hook.
     *
     * @param name The name of the hook
     * @param handler Optional handler function reference. If not provided, *all* handlers will be removed.
     * @param priority Optional handler priority. If provided, only handlers with the given priority will be removed.
     */
    public remove(name: string, handler?: HookHandler<any>, priority?: number): void {
        let hooks = this.hooks.get(name) || [];

        hooks = hooks.filter(hook => {
            return hook.handler !== handler && hook.priority !== priority;
        });

        hooks.sort((a, b) => a.priority - b.priority);

        if (hooks.length === 0) {
            this.hooks.delete(name);
        } else {
            this.hooks.set(name, hooks);
        }
    }

    /**
     * Emit a hook event.
     *
     * The optional data object will be accessible in the event object's `.data` field.
     *
     * Event handlers are executed serially, in order of their priority. Each handler receives
     * the same data object, so handlers MAY alter the data for later handlers.
     *
     * The promised return value is the original data object, which MAY have been altered by
     * any event handlers that were run.
     *
     * If an error occurs during the event processing, any handlers assigned to the `error`
     * hook will be run (unless the error occurred while running an error handler).
     *
     * @param name The name of the hook
     * @param data Arbitrary event data object.
     */
    public async emit<T extends object>(name: string, data: T = {} as T): Promise<T> {
        const event = new HookEvent(name, data);
        const hooks = this.hooks.get(name) || [];
        let handlerDestroyed = false;

        this.log('verbose', 'events :: %s :: %o', name, data);

        for (const hook of hooks) {
            if (event._stopped) {
                return event.data;
            }

            try {
                await hook.handler(event);
                if (event._destroyHandler) {
                    handlerDestroyed = true;
                    hook.destroy = true;
                    event._destroyHandler = false;
                }
            } catch (error) {
                // We'll try to forward all errors to an error hook
                // handler, unless we had an error while processing
                // an error, in which case we bail.
                if (name === 'error') {
                    this.log('error', 'Error processing exception: %o %s', error, error.stack);
                    throw error;
                } else if (!this.hooks.has('error')) {
                    // Rethrow the error so that the code triggering
                    // the hook is informed of the error.
                    throw error;
                } else {
                    // Allow a hook to process the error so that it
                    // can be logged, etc.
                    await this.emit('error', {
                        data,
                        error,
                        hook
                    });
                }
            } finally {
                if (event._destroy) {
                    this.hooks.delete(name);
                } else if (handlerDestroyed) {
                    this.hooks.set(name, hooks.filter(handler => !handler.destroy));
                }
            }

            if (event._destroy) {
                break;
            }
        }

        return event.data;
    }
}

export default HookEmitter;
