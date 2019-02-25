import WildEmitter from 'wildemitter';

import * as JXT from './jxt';
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
} from './protocol/stanzas';
import { Factory, MechClass } from './sasl';
import SM from './StreamManagement';

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
    test: { test: boolean };
}

export interface Agent extends WildEmitter<AgentEvents> {
    jid: string;
    config: AgentConfig;
    transport?: Transport;
    sm: SM;
    sasl: Factory;
    stanzas: JXT.Registry;

    sessionStarted: boolean;

    use(plugin: (agent: Agent, registry: JXT.Registry, config: AgentConfig) => void): void;

    nextId(): string;

    disconnect(): void;
    send<T extends keyof TopLevelElements>(path: T, data: TopLevelElements[T]): void;

    sendIQ<T = IQ, R = T>(iq: T & IQ): Promise<IQ & R>;
    sendIQResult(orig: IQ, result?: Partial<IQ>): void;
    sendIQError(orig: IQ, err?: Partial<IQ>): void;
    sendMessage(msg: Message): void;
    sendPresence(pres: Presence): void;
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
    sasl?: string | Array<string | MechClass>;
    password?: string;
}

export interface Transport extends WildEmitter {
    hasStream?: boolean;
    stream?: Stream;
    authenticated?: boolean;

    connect(opts: any): void;
    disconnect(): void;
    restart(): void;
    send(name: string, data?: object): void;
}
