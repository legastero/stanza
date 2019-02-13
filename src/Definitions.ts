import WildEmitter from 'wildemitter';

import { JID } from './protocol/jid';
import {
    IQ,
    Message,
    Presence,
    SASL,
    StreamError,
    StreamFeatures,
    StreamManagement
} from './protocol/stanzas';

export interface TopLevelElements {
    message: Message;
    iq: IQ;
    presence: Presence;
    error: StreamError;
    sasl: SASL;
    features: StreamFeatures;
    sm: StreamManagement;
}

export interface AgentEvents {
    test: { test: boolean };
}

export interface Agent extends WildEmitter<AgentEvents> {
    jid: JID;
    config: AgentConfig;
    transport?: any;
    sm: any;
    SASLFactory: any;

    sessionStarted: boolean;

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
    jid: JID | string;
    server?: string;
    resource?: string;
    timeout?: number;
}
