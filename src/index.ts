import { EventEmitter } from 'events';

import Client from './Client';
import * as Constants from './Constants';
import * as RTT from './helpers/RTT';
import * as JID from './JID';
import * as Jingle from './jingle';
import * as JXT from './jxt';
import { Factory } from './lib/sasl';
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

    'message:sent': Stanzas.Message;
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

    raw: (direction: 'incoming' | 'outgoing', data: string) => void;

    connected: void;
    disconnected?: Error;

    'bosh:terminate': any;
}

export interface Agent extends StrictEventEmitter<EventEmitter, AgentEvents> {
    jid: string;
    config: AgentConfig;
    transport?: Transport;
    sm: SM;
    sasl: Factory;
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
    jid?: string;
    server?: string;
    resource?: string;
    timeout?: number;
    transports?: string | string[];
    transport?: string;
    wsURL?: string;
    boshURL?: string;
    password?: string;
    lang?: string;
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

export { Client, Constants, JXT, JID, Namespaces, Stanzas, Jingle, Utils, RTT };

export const VERSION = '__STANZAJS_VERSION__';

import Plugins from './plugins';
export * from './plugins';

export function createClient(opts: AgentConfig): Agent {
    const client = new Client(opts);
    client.use(Plugins);

    return (client as unknown) as Agent;
}
