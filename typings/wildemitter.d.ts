declare module 'wildemitter' {
    import { EventEmitter } from 'events';

    class WildEmitter<T = object> extends EventEmitter {
        constructor();
        public isWildEmitter: boolean;
        public on<E extends keyof T>(name: E, handler: (data: T[E]) => void): this;
        public on(name: string, handler: (...data: any[]) => void): this;
        public on(name: string, group: string, handler: (...data: any[]) => void): this;
        public once<E extends keyof T>(name: E, handler: (data: T[E]) => void): this;
        public once(name: string, handler: (...data: any[]) => void): this;
        public once(name: string, group: string, handler: (...data: any[]) => void): this;
        public emit<E extends keyof T>(name: E, data: T[E]): boolean;
        public emit(name: string, ...data: any[]): boolean;
        public releaseGroup(group: string): this;
        public off(name: string, handler?: any): this;
    }

    export = WildEmitter;
}
