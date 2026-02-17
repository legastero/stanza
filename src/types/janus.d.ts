declare module 'janus-gateway' {
    export interface JanusInitOptions {
        debug?: boolean | 'all' | string[];
        callback?: () => void;
        dependencies?: string[];
    }

    export interface JanusOptions {
        server: string | string[];
        iceServers?: RTCIceServer[];
        ipv6?: boolean;
        withCredentials?: boolean;
        max_poll_events?: number;
        destroyOnUnload?: boolean;
        token?: string;
        apisecret?: string;
        success?: () => void;
        error?: (error: any) => void;
        destroyed?: () => void;
    }

    export interface JanusEvents {
        'participant-joined': (participantId: string, displayName: string) => void;
        'participant-left': (participantId: string) => void;
        'stream-started': (stream: MediaStream) => void;
        'stream-stopped': (stream: MediaStream) => void;
        'error': (error: Error) => void;
    }

    export interface PluginHandle extends EventEmitter {
        plugin: string;
        id: string;
        token?: string;
        detached: boolean;
        webrtcStuff: any;
        createOffer(options: any): void;
        createAnswer(options: any): void;
        send(options: any): void;
        on<E extends keyof JanusEvents>(event: E, listener: JanusEvents[E]): this;
        emit<E extends keyof JanusEvents>(event: E, ...args: Parameters<JanusEvents[E]>): boolean;
    }

    export interface JanusInstance {
        attach(options: {
            plugin: string;
            opaqueId?: string;
            success?: (handle: PluginHandle) => void;
            error?: (error: any) => void;
            consentDialog?: (on: boolean) => void;
            onmessage?: (msg: any, jsep: any) => void;
            onlocalstream?: (stream: MediaStream) => void;
            onremotestream?: (stream: MediaStream) => void;
            ondata?: (data: any) => void;
            ondataopen?: () => void;
            oncleanup?: () => void;
            ondetached?: () => void;
        }): void;
        destroy(options?: { success?: () => void; error?: (error: any) => void }): void;
    }

    export const Janus: {
        new (options: JanusOptions): JanusInstance;
        init(options: JanusInitOptions): void;
        isWebrtcSupported(): boolean;
    };
} 