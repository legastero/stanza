// ====================================================================
// RFC 6120: Extensible Messaging and Presence Protocol (XMPP): Core
// --------------------------------------------------------------------
// Source: https://tools.ietf.org/html/rfc6120
// ====================================================================

import { Buffer } from '../platform';

import {
    IQType,
    MessageType,
    PresenceType,
    SASLFailureCondition,
    StanzaErrorCondition,
    StreamErrorCondition,
    StreamType
} from '../Constants';
import {
    attribute,
    childAlternateLanguageText,
    childBoolean,
    childEnum,
    childText,
    DefinitionOptions,
    FieldDefinition,
    JIDAttribute,
    languageAttribute,
    LanguageSet,
    multipleChildText,
    textBuffer
} from '../jxt';
import {
    NS_BIND,
    NS_CLIENT,
    NS_SASL,
    NS_STANZAS,
    NS_STARTTLS,
    NS_STREAM,
    NS_STREAMS
} from '../Namespaces';

import { IQ, IQBase, Message, Presence } from './';

declare module './' {
    export interface Stream {
        type?: 'stream' | 'open' | 'close';
        to?: string;
        from?: string;
        id?: string;
        version?: string;
        lang?: string;
    }

    export interface StreamFeatures {
        sasl?: SASLFeature;
        tls?: TLS;
        bind?: Bind;
    }

    export interface StreamError {
        condition: StreamErrorCondition;
        text?: string;
        alternateLanguageText?: LanguageSet<string>;
        seeOtherHost?: string;
    }

    export interface StanzaError {
        by?: string;
        type?: string;
        condition: StanzaErrorCondition;
        text?: string;
        alternateLanguageText?: LanguageSet<string>;
        redirect?: string;
        gone?: string;
    }

    export interface Message {
        to?: string;
        from?: string;
        id?: string;
        lang?: string;
        streamType?: StreamType;
        type?: MessageType;
        error?: StanzaError;
    }

    export interface Presence {
        to?: string;
        from?: string;
        id?: string;
        lang?: string;
        streamType?: StreamType;
        type?: PresenceType;
        error?: StanzaError;
    }

    export interface IQBase {
        to?: string;
        from?: string;
        id?: string;
        type: IQType;
        lang?: string;
        streamType?: StreamType;
        error?: StanzaError;
        payloadType?: Exclude<keyof IQ, keyof IQBase> | 'invalid-payload-count' | 'unknown-payload';
    }

    export interface IQ {
        bind?: Bind;
    }
}

export interface ReceivedIQ extends IQ {
    to: string;
    from: string;
    id: string;
}

export interface ReceivedIQGet extends ReceivedIQ {
    type: typeof IQType.Get;
}

export interface ReceivedIQSet extends ReceivedIQ {
    type: typeof IQType.Set;
}

export interface ReceivedMessage extends Message {
    to: string;
    from: string;
}

export interface ReceivedPresence extends Presence {
    to: string;
    from: string;
}

export interface SASLFeature {
    mechanisms: string[];
}
export interface SASLAbort {
    type: 'abort';
}
export interface SASLChallengeResponse {
    type: 'challenge' | 'response';
    value?: Buffer;
}
export interface SASLSuccess {
    type: 'success';
    value?: Buffer;
}
export interface SASLAuth {
    type: 'auth';
    mechanism: string;
    value?: Buffer;
}
export interface SASLFailure {
    type: 'failure';
    condition: SASLFailureCondition;
    text?: string;
    alternateLanguageText?: LanguageSet<string>;
}
export type SASL = SASLAbort | SASLChallengeResponse | SASLSuccess | SASLFailure | SASLAuth;

export interface TLS {
    type?: 'start' | 'proceed' | 'failure';
    required?: boolean;
}

export interface Bind {
    jid?: string;
    resource?: string;
}

const _Stream: DefinitionOptions = {
    defaultType: 'stream',
    element: 'stream',
    fields: {
        from: attribute('from'),
        id: attribute('id'),
        lang: languageAttribute(),
        to: attribute('to'),
        version: attribute('version')
    },
    namespace: NS_STREAM,
    path: 'stream',
    type: 'stream',
    typeField: 'action'
};

const _StreamFeatures: DefinitionOptions = {
    element: 'features',
    namespace: NS_STREAM,
    path: 'features'
};

const _StreamError: DefinitionOptions = {
    element: 'error',
    fields: {
        alternateLanguageText: childAlternateLanguageText(NS_STREAMS, 'text'),
        condition: childEnum(
            NS_STREAMS,
            Object.values(StreamErrorCondition),
            StreamErrorCondition.UndefinedCondition
        ),
        seeOtherHost: childText(NS_STREAMS, StreamErrorCondition.SeeOtherHost),
        text: childText(NS_STREAMS, 'text')
    },
    namespace: NS_STREAM,
    path: 'streamError'
};

// --------------------------------------------------------------------

const _StanzaError: DefinitionOptions[] = Object.values(StreamType).map(streamNS => ({
    aliases: ['stanzaError', 'message.error', 'presence.error', 'iq.error'],
    defaultType: NS_CLIENT,
    element: 'error',
    fields: {
        alternateLanguageText: childAlternateLanguageText(NS_STANZAS, 'text'),
        by: JIDAttribute('by'),
        condition: childEnum(
            NS_STANZAS,
            Object.values(StanzaErrorCondition),
            StanzaErrorCondition.UndefinedCondition
        ),
        gone: childText(NS_STANZAS, StanzaErrorCondition.Gone),
        redirect: childText(NS_STANZAS, StanzaErrorCondition.Redirect),
        text: childText(NS_STANZAS, 'text'),
        type: attribute('type')
    },
    namespace: streamNS,
    type: streamNS,
    typeField: 'streamType'
}));

// --------------------------------------------------------------------

const baseIQFields: Set<keyof IQBase> = new Set([
    'from',
    'id',
    'lang',
    'to',
    'type',
    'payloadType',
    'error',
    'streamType'
]);
const _IQ: DefinitionOptions[] = Object.values(StreamType).map(
    (streamNS: string): DefinitionOptions => ({
        childrenExportOrder: {
            error: 200000
        },
        defaultType: NS_CLIENT,
        element: 'iq',
        fields: {
            from: JIDAttribute('from'),
            id: attribute('id'),
            lang: languageAttribute(),
            payloadType: {
                order: -10000,
                importer(xml, context) {
                    if (
                        (context.data! as IQ).type !== 'get' &&
                        (context.data! as IQ).type !== 'set'
                    ) {
                        return;
                    }
                    const childCount = xml.children.filter(child => typeof child !== 'string')
                        .length;
                    if (childCount !== 1) {
                        return 'invalid-payload-count';
                    }
                    const extensions = Object.keys(context.data!).filter(
                        key => !baseIQFields.has(key as any)
                    );
                    if (extensions.length !== 1) {
                        return 'unknown-payload';
                    }
                    return extensions[0];
                }
            } as FieldDefinition<string>,
            to: JIDAttribute('to'),
            type: attribute('type')
        },
        namespace: streamNS,
        path: 'iq',
        type: streamNS,
        typeField: 'streamType'
    })
);

// --------------------------------------------------------------------

const _Message: DefinitionOptions[] = Object.values(StreamType).map(streamNS => ({
    childrenExportOrder: {
        error: 200000
    },
    defaultType: NS_CLIENT,
    element: 'message',
    fields: {
        from: JIDAttribute('from'),
        id: attribute('id'),
        lang: languageAttribute(),
        to: JIDAttribute('to')
    },
    namespace: streamNS,
    path: 'message',
    type: streamNS,
    typeField: 'streamType'
}));

// --------------------------------------------------------------------

const _Presence = Object.values(StreamType).map(streamNS => ({
    childrenExportOrder: {
        error: 200000
    },
    defaultType: NS_CLIENT,
    element: 'presence',
    fields: {
        from: JIDAttribute('from'),
        id: attribute('id'),
        lang: languageAttribute(),
        to: JIDAttribute('to')
    },
    namespace: streamNS,
    path: 'presence',
    type: streamNS,
    typeField: 'streamType'
}));

// --------------------------------------------------------------------

const _SASL: DefinitionOptions[] = [
    {
        element: 'mechanisms',
        fields: {
            mechanisms: multipleChildText(null, 'mechanism')
        },
        namespace: NS_SASL,
        path: 'features.sasl'
    },
    {
        element: 'abort',
        namespace: NS_SASL,
        path: 'sasl',
        type: 'abort',
        typeField: 'type'
    },
    {
        element: 'auth',
        fields: {
            mechanism: attribute('mechanism'),
            value: textBuffer('base64')
        },
        namespace: NS_SASL,
        path: 'sasl',
        type: 'auth',
        typeField: 'type'
    },
    {
        element: 'challenge',
        fields: {
            value: textBuffer('base64')
        },
        namespace: NS_SASL,
        path: 'sasl',
        type: 'challenge',
        typeField: 'type'
    },
    {
        element: 'response',
        fields: {
            value: textBuffer('base64')
        },
        namespace: NS_SASL,
        path: 'sasl',
        type: 'response',
        typeField: 'type'
    },
    {
        element: 'success',
        fields: {
            value: textBuffer('base64')
        },
        namespace: NS_SASL,
        path: 'sasl',
        type: 'success',
        typeField: 'type'
    },
    {
        element: 'failure',
        fields: {
            alternateLanguageText: childAlternateLanguageText(NS_SASL, 'text'),
            condition: childEnum(NS_SASL, Object.values(SASLFailureCondition)),
            text: childText(NS_SASL, 'text')
        },
        namespace: NS_SASL,
        path: 'sasl',
        type: 'failure',
        typeField: 'type'
    }
];

// --------------------------------------------------------------------

const _STARTTLS: DefinitionOptions[] = [
    {
        aliases: ['features.tls'],
        defaultType: 'start',
        element: 'starttls',
        fields: {
            required: childBoolean(null, 'required')
        },
        namespace: NS_STARTTLS,
        path: 'tls',
        type: 'start',
        typeField: 'type'
    },
    {
        element: 'proceed',
        namespace: NS_STARTTLS,
        path: 'tls',
        type: 'proceed',
        typeField: 'type'
    },
    {
        element: 'failure',
        namespace: NS_STARTTLS,
        path: 'tls',
        type: 'failure',
        typeField: 'type'
    }
];

// --------------------------------------------------------------------

const _Bind: DefinitionOptions = {
    aliases: ['features.bind', 'iq.bind'],
    element: 'bind',
    fields: {
        jid: childText(null, 'jid'),
        resource: childText(null, 'resource')
    },
    namespace: NS_BIND
};

// --------------------------------------------------------------------

const Protocol: DefinitionOptions[] = [
    _Stream,
    _StreamFeatures,
    _StreamError,
    ..._StanzaError,
    ..._SASL,
    ..._STARTTLS,
    ..._IQ,
    ..._Message,
    ..._Presence,
    _Bind
];
export default Protocol;
