export type EventHandler<E> = (...data: E[]) => void;

export default class WildEmitter<T = { [key: string]: any }> {
    public isWildEmitter = true;
    protected callbacks: { [key: string]: Array<EventHandler<any>> } = {};

    public on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): this;
    public on<K extends keyof T>(
        event: K,
        group: string | undefined,
        handler: EventHandler<T[K]>
    ): this;
    public on<K extends keyof T>(
        event: K,
        groupNameOrHandler: string | ((...data: Array<T[K]>) => void) | undefined,
        handler?: (...data: Array<T[K]>) => void
    ): this {
        const hasGroup = arguments.length === 3;
        const group: string | undefined = hasGroup ? (arguments[1] as string) : undefined;
        const func: EventHandler<T[K]> = hasGroup ? arguments[2] : arguments[1];
        (func as any)._groupName = group;
        (this.callbacks[event as string] = this.callbacks[event as string] || []).push(func);
        return this;
    }

    public once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): this;
    public once<K extends keyof T>(event: K, group: string, handler: EventHandler<T[K]>): this;
    public once<K extends keyof T>(
        event: K,
        groupNameOrHandler: string | EventHandler<T[K]>,
        handler?: EventHandler<T[K]>
    ): this {
        const hasGroup = arguments.length === 3;
        const group: string | undefined = hasGroup ? (arguments[1] as string) : undefined;
        const func: EventHandler<T[K]> = hasGroup ? arguments[2] : arguments[1];

        const on = () => {
            this.off(event, on);
            func.apply(this, (arguments as unknown) as any[]);
        };

        this.on(event, group, on);
        return this;
    }

    public releaseGroup(groupName: string): this {
        this.callbacks = this.callbacks || {};
        for (const item of Object.keys(this.callbacks)) {
            const handlers = this.callbacks[item];
            for (let i = 0, len = handlers.length; i < len; i++) {
                if ((handlers[i] as any)._groupName === groupName) {
                    // remove it and shorten the array we're looping through
                    handlers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        return this;
    }

    public off<K extends keyof T>(event: K, fn?: EventHandler<T[K]>): this {
        this.callbacks = this.callbacks || {};
        const callbacks = this.callbacks[event as string];
        if (!callbacks) {
            return this;
        }

        // remove all handlers
        if (!fn) {
            delete this.callbacks[event as string];
            return this;
        }

        // remove specific handler
        const i = callbacks.indexOf(fn);
        callbacks.splice(i, 1);
        if (callbacks.length === 0) {
            delete this.callbacks[event as string];
        }
        return this;
    }

    public emit<K extends keyof T>(event: K, ...data: Array<T[K]>): this {
        this.callbacks = this.callbacks || {};
        const args = [].slice.call(arguments, 1);
        const callbacks = this.callbacks[event as string];
        const specialCallbacks = this.getWildcardCallbacks(event as string);

        if (callbacks) {
            const listeners = callbacks.slice();
            for (let i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, args);
            }
        }

        if (specialCallbacks) {
            const listeners = specialCallbacks.slice();
            for (let i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, [event].concat(args));
            }
        }

        return this;
    }

    private getWildcardCallbacks(eventName: string): Array<EventHandler<any>> {
        this.callbacks = this.callbacks || {};
        let result: Array<EventHandler<any>> = [];

        for (const item of Object.keys(this.callbacks)) {
            const split = item.split('*');
            if (
                item === '*' ||
                (split.length === 2 && eventName.slice(0, split[0].length) === split[0])
            ) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    }
}
