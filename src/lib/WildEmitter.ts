export type EventHandler = (...data: any[]) => void;

export default class WildEmitter<T = object> {
    public isWildEmitter = true;
    protected callbacks: { [key: string]: EventHandler[] } = {};

    public on(event: string, handler: EventHandler): this;
    public on(event: string, group: string | undefined, handler: EventHandler): this;
    public on(
        event: string,
        groupNameOrHandler: string | ((...data: any[]) => void) | undefined,
        handler?: (...data: any[]) => void
    ): this {
        const hasGroup = arguments.length === 3;
        const group: string | undefined = hasGroup ? (arguments[1] as string) : undefined;
        const func: EventHandler = hasGroup ? arguments[2] : arguments[1];
        (func as any)._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    }

    public once(event: string, handler: EventHandler): this;
    public once(event: string, group: string, handler: EventHandler): this;
    public once(
        event: string,
        groupNameOrHandler: string | EventHandler,
        handler?: EventHandler
    ): this {
        const hasGroup = arguments.length === 3;
        const group: string | undefined = hasGroup ? (arguments[1] as string) : undefined;
        const func: EventHandler = hasGroup ? arguments[2] : arguments[1];

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

    public off(event: string, fn?: EventHandler): this {
        this.callbacks = this.callbacks || {};
        const callbacks = this.callbacks[event];
        if (!callbacks) {
            return this;
        }

        // remove all handlers
        if (!fn) {
            delete this.callbacks[event];
            return this;
        }

        // remove specific handler
        const i = callbacks.indexOf(fn);
        callbacks.splice(i, 1);
        if (callbacks.length === 0) {
            delete this.callbacks[event];
        }
        return this;
    }

    public emit(event: string, ...data: any[]): this {
        this.callbacks = this.callbacks || {};
        const args = [].slice.call(arguments, 1);
        const callbacks = this.callbacks[event];
        const specialCallbacks = this.getWildcardCallbacks(event);

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

    private getWildcardCallbacks(eventName: string): EventHandler[] {
        this.callbacks = this.callbacks || {};
        let result: EventHandler[] = [];

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
