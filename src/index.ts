import { EventEmitter } from 'events';

import Client from './Client';
import * as Constants from './Constants';
import * as RTT from './helpers/RTT';
import SM from './helpers/StreamManagement';
import * as JID from './JID';
import * as Jingle from './jingle';
import * as JXT from './jxt';
import * as LibSASL from './lib/sasl';
import StrictEventEmitter from './lib/StrictEventEmitter';
import * as Namespaces from './Namespaces';
import * as Stanzas from './protocol';
import {
    CSI,
    IQ,
    Message,
    Presence,
    SASL,
    Stream,
    StreamError,
    StreamFeatures,
    StreamManagement
} from './protocol';
import * as Utils from './Utils';

export * from './helpers/StreamManagement';

export interface TopLevelElements {
    message: Message;
    iq: IQ;
    presence: Presence;
    error: StreamError;
    sasl: SASL;
    features: StreamFeatures;
    sm: StreamManagement;
    csi: CSI;
}

export interface AgentEvents {
    message: Stanzas.ReceivedMessage;
    presence: Stanzas.ReceivedPresence;
    iq: Stanzas.ReceivedIQ;
    features: Stanzas.StreamFeatures;
    stanza: Stanzas.Message | Stanzas.Presence | Stanzas.IQ;

    'stream:start': Stanzas.Stream;
    'stream:end': void;
    'stream:error': (streamError: Stanzas.StreamError, error?: Error) => void;
    'stream:data': (json: any, kind: string) => void;

    'message:sent': (msg: Stanzas.Message, viaCarbon: boolean) => void;
    'message:error': Stanzas.Message;
    'message:failed': Stanzas.Message;
    'message:acked': Stanzas.Message;
    'message:retry': Stanzas.Message;
    'message:hibernated': Stanzas.Message;

    chat: Stanzas.ReceivedMessage;
    groupchat: Stanzas.ReceivedMessage;

    available: Stanzas.ReceivedPresence;
    unavailable: Stanzas.ReceivedPresence;
    subscribe: Stanzas.ReceivedPresence;
    subscribed: Stanzas.ReceivedPresence;
    unsubscribe: Stanzas.ReceivedPresence;
    unsubscribed: Stanzas.ReceivedPresence;
    probe: Stanzas.ReceivedPresence;
    'presence:error': Stanzas.ReceivedPresence;

    'session:started': string | void;
    'session:prebind': string;
    'session:bound': string;
    'session:end': undefined;

    'stanza:failed':
        | { kind: 'message'; stanza: Stanzas.Message }
        | { kind: 'presence'; stanza: Stanzas.Presence }
        | { kind: 'iq'; stanza: Stanzas.IQ };
    'stanza:hibernated':
        | { kind: 'message'; stanza: Stanzas.Message }
        | { kind: 'presence'; stanza: Stanzas.Presence }
        | { kind: 'iq'; stanza: Stanzas.IQ };
    'stanza:acked':
        | { kind: 'message'; stanza: Stanzas.Message }
        | { kind: 'presence'; stanza: Stanzas.Presence }
        | { kind: 'iq'; stanza: Stanzas.IQ };

    'raw:incoming': string;
    'raw:outgoing': string;
    'raw:*': (direction: 'incoming' | 'outgoing', data: string) => void;
    raw: (direction: 'incoming' | 'outgoing', data: string) => void;

    connected: void;
    disconnected?: Error;

    'bosh:terminate': any;

    // Any "--" prefixed events are for internal use only
    '--reset-stream-features': void;
    '--transport-disconnected': void;

    '*': (...args: any[]) => void;
}

export interface Agent extends StrictEventEmitter<EventEmitter, AgentEvents> {
    jid: string;
    config: AgentConfig;
    transport?: Transport;
    sm: SM;
    sasl: LibSASL.Factory;
    stanzas: JXT.Registry;

    sessionStarting: boolean;
    sessionStarted: boolean;
    sessionTerminating: boolean;

    use(plugin: (agent: Agent, registry: JXT.Registry, config: AgentConfig) => void): void;

    nextId(): string;

    updateConfig(opts?: AgentConfig): void;
    connect(opts?: AgentConfig): void;
    disconnect(): void;
    send<T extends keyof TopLevelElements>(path: T, data: TopLevelElements[T]): Promise<void>;

    sendIQ<T = IQ, R = T>(iq: T & IQ): Promise<IQ & R>;
    sendIQResult(orig: IQ, result?: Partial<IQ>): void;
    sendIQError(orig: IQ, err?: Partial<IQ>): void;
    sendMessage(msg: Message): string;
    sendPresence(pres?: Presence): string;
    sendStreamError(err: StreamError): void;
}

export interface AgentConfig {
    /**
     * Allow Stream Management Resumption
     *
     * When true (along with useStreamManagement), the session will be resumable after a disconnect.
     *
     * However, this means that the session will still appear as alive for a few minutes after a connection loss.
     *
     * @default true
     */
    allowResumption?: boolean;

    /**
     * Allow for automatic reconnections.
     *
     * @default false
     */
    autoReconnect?: boolean;

    /**
     * Maximum delay between auto reconnect attempts, in seconds.
     *
     * @default 32
     */
    maxReconnectBackoff?: number;

    /**
     * User JID
     */
    jid?: string;

    /**
     * Server Domain Name
     *
     * Set the expected name of the server instead of using domain in the provided JID.
     */
    server?: string;

    /**
     * Connection Resource
     *
     * Optionally request for the server to bind a specific resource for the connection.
     *
     * Note that the server is allowed ignore the request.
     */
    resource?: string;

    /**
     * IQ Timeout
     *
     * The number of seconds to wait before timing out IQ requests.
     *
     * @default 15
     */
    timeout?: number;

    /**
     * Transport Configurations
     *
     * Limit the transport types that will be used, or specify connection
     * URLs to use without needing to use auto-discovery.
     *
     * If a transport is set to <code>false</code>, it will be disabled.
     *
     * If a transport is set to a string, that will be used as the connection URL.
     *
     * If a transport is set to an object, it MUST include a <code>url</code> value for
     * the connection URL.
     *
     * @default { websocket: true, bosh: true, tcp: true }
     */
    transports?: { [key: string]: boolean | string | Partial<TransportConfig> };

    /**
     * Account Password
     *
     * Equivalent to using <code>credentials: { password: '*****' }</code>.
     */
    password?: string;

    /**
     * User Language
     *
     * The associated language code for content created by the user.
     */
    lang?: string;

    /**
     * Accepted Languages
     *
     * A list of language codes acceptable to the user.
     */
    acceptLanguages?: string[];
}

export interface Transport {
    hasStream?: boolean;
    stream?: Stream;
    authenticated?: boolean;

    connect(opts: TransportConfig): void;
    disconnect(cleanly?: boolean): void;
    restart(): void;
    send(name: string, data?: JXT.JSONData): Promise<void>;
}

export interface TransportConfig {
    lang?: string;
    acceptLanguages?: string[];
    server: string;
    url: string;
    jid: string;

    // BOSH settings
    sid?: string;
    rid?: number;
    maxRetries?: number;
    wait?: number;
    maxHoldOpen?: number;

    // TCP/TLS settings
    directTLS?: boolean,
    port?: number,
}

import * as RSM from './helpers/RSM';
import * as DataForms from './helpers/DataForms';

export {
    Client,
    Constants,
    DataForms,
    JXT,
    JID,
    Namespaces,
    Stanzas,
    Jingle,
    Utils,
    RSM,
    RTT,
    LibSASL as SASL
};

export const VERSION = Constants.VERSION;

import Plugins from './plugins';
export * from './plugins';

export function createClient(opts: AgentConfig): Agent {
    const client = new Client(opts);
    client.use(Plugins);

    return (client as unknown) as Agent;
}
