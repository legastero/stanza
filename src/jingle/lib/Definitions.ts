import { ApplicationDescription, ContentSenders, TransportDescription } from './JingleUtil';

// Jingle RTP Application Description
// ====================================================================

export interface RTPApplicationDescription extends ApplicationDescription {
    applicationType: string;
    media?: string;
    ssrc?: string;
    mux?: boolean;
    headerExtensions?: RTPApplicationHeaderExtension[];
    sources?: RTPApplicationSource[];
    sourceGroups?: RTPApplicationSourceGroup[];
    streams?: RTPApplicationMediaStream[];
    payloads?: RTPApplicationPayload[];
    feedback?: RTPApplicationFeedback[];
}

export interface RTPApplicationHeaderExtension {
    id: number;
    senders?: ContentSenders;
    uri: string;
}

export interface RTPApplicationPayload {
    channels: string;
    clockrate: string;
    id: string;
    maxptime?: string;
    name?: string;
    ptime?: string;
    parameters?: RTPApplicationParameter[];
    feedback?: RTPApplicationFeedback[];
}

export interface RTPApplicationParameter {
    key: string;
    value?: string;
}

export interface RTPApplicationSource {
    ssrc: string;
    parameters?: RTPApplicationParameter[];
}

export interface RTPApplicationSourceGroup {
    semantics: string;
    sources: string[];
}

export interface RTPApplicationMediaStream {
    id: string;
    track: string;
}

export interface RTPApplicationFeedback {
    type: string;
    subtype?: string;
    value?: string;
}

// Jingle ICE Transport Description
// ====================================================================

export interface ICETransportDescription extends TransportDescription {
    ufrag?: string;
    pwd?: string;
    candidates?: ICETransportCandidate[];
    fingerprints?: ICETransportFingerprint[];
    sctp?: ICETransportDataChannel[];
    gatheringComplete?: boolean;
}

export interface ICETransportCandidate {
    component?: string;
    foundation?: string;
    generation?: string;
    id?: string;
    ip: string;
    network?: string;
    port: string;
    priority?: string;
    protocol: string;
    relAddr?: string;
    relPort?: string;
    tcpType?: string;
    type: string;
}

export interface ICETransportFingerprint {
    hash: string;
    value: string;
    setup: string;
}

export interface ICETransportDataChannel {
    number: string;
    protocol: string;
    streams: string;
}
