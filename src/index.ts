import { EventEmitter } from 'events';

import Client from './Client';
import * as Constants from './Constants';
import * as RTT from './helpers/RTT';
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
import SM from './StreamManagement';
import * as Utils from './Utils';

export * from './StreamManagement';

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
    chat: Stanzas.ReceivedMessage;
    groupchat: Stanzas.ReceivedMessage;

    available: Stanzas.ReceivedPresence;
    unavailable: Stanzas.ReceivedPresence;

    'session:started': string | void;
    'session:prebind': string;
    'session:bound': string;
    'session:end': undefined;

    'stanza:failed':
        | { kind: 'message'; stanza: Stanzas.Message }
        | { kind: 'presence'; stanza: Stanzas.Presence }
        | { kind: 'iq'; stanza: Stanzas.IQ };
    'stanza:acked':
        | { kind: 'message'; stanza: Stanzas.Message }
        | { kind: 'presence'; stanza: Stanzas.Presence }
        | { kind: 'iq'; stanza: Stanzas.IQ };

    'raw:incoming': (data: string) => void;
    'raw:outgoing': (data: string) => void;
    'raw:*': (direction: 'incoming' | 'outgoing', data: string) => void;
    raw: (direction: 'incoming' | 'outgoing', data: string) => void;

    connected: void;
    disconnected?: Error;

    'bosh:terminate': any;

    '*': (...args: any[]) => void;
}

export interface Agent extends StrictEventEmitter<EventEmitter, AgentEvents> {
    jid: string;
    config: AgentConfig;
    transport?: Transport;
    sm: SM;
    sasl: LibSASL.Factory;
    stanzas: JXT.Registry;

    sessionStarted: boolean;

    use(plugin: (agent: Agent, registry: JXT.Registry, config: AgentConfig) => void): void;

    nextId(): string;

    connect(opts?: AgentConfig): void;
    disconnect(): void;
    send<T extends keyof TopLevelElements>(path: T, data: TopLevelElements[T]): void;

    sendIQ<T = IQ, R = T>(iq: T & IQ): Promise<IQ & R>;
    sendIQResult(orig: IQ, result?: Partial<IQ>): void;
    sendIQError(orig: IQ, err?: Partial<IQ>): void;
    sendMessage(msg: Message): void;
    sendPresence(pres?: Presence): void;
    sendStreamError(err: StreamError): void;
}

export interface AgentConfig {
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
     * IQ Timeout
     *
     * Limit the transport types that will be used.
     *
     * @default ["websocket", "bosh"]
     */
    transports?: string | string[];

    /**
     * Connection Transport
     *
     * Manually set the transport type to use instead of auto-discovering.
     */
    transport?: string;

    /**
     * WebSocket URL
     *
     * Manually set the WebSocket connection URL to use instead of auto-discovering.
     */
    wsURL?: string;

    /**
     * BOSH URL
     *
     * Manually set the BOSH connection URL to use instead of auto-discovering.
     */
    boshURL?: string;

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
    disconnect(): void;
    restart(): void;
    send(name: string, data?: object): void;
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
}

export { Client, Constants, JXT, JID, Namespaces, Stanzas, Jingle, Utils, RTT, LibSASL as SASL };

export const VERSION = '__STANZAJS_VERSION__';

import Plugins from './plugins';
export * from './plugins';

export function createClient(opts: AgentConfig): Agent {
    const client = new Client(opts);
    client.use(Plugins);

    return (client as unknown) as Agent;
}
