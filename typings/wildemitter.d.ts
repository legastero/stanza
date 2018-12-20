declare module 'wildemitter' {
    import { EventEmitter } from 'events';

    class WildEmitter extends EventEmitter {
        constructor();
        public isWildEmitter: boolean;
        public on(name: string, handler: Function): this;
        public on(name: string, group: string, handler: Function): this;
        public once(name: string, handler: Function): this;
        public once(name: string, group: string, handler: Function): this;
        public releaseGroup(group: string): this;
    }

    export = WildEmitter;
}
