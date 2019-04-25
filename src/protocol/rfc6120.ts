// ====================================================================
// RFC 6120: Extensible Messaging and Presence Protocol (XMPP): Core
// --------------------------------------------------------------------
// Source: https://tools.ietf.org/html/rfc6120
// ====================================================================

import {
    attribute,
    childAlternateLanguageText,
    childBoolean,
    childEnum,
    childText,
    DefinitionOptions,
    FieldDefinition,
    languageAttribute,
    LanguageSet,
    multipleChildText,
    textBuffer
} from '../jxt';

import { NS_BIND, NS_CLIENT, NS_SASL, NS_STANZAS, NS_STARTTLS, NS_STREAM } from './Namespaces';

import { IQ } from './';
import { JIDAttribute, STREAM_TYPES } from './util';

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
        condition: string;
        text?: string;
        alternateLanguageText?: LanguageSet<string>;
        seeOtherHost?: string;
    }

    export interface StanzaError {
        by?: string;
        type?: string;
        condition: string;
        text?: string;
        alternateLanguageText?: LanguageSet<string>;
        redirect?: string;
        gone?: string;
    }

    export interface IQ {
        to?: string;
        from?: string;
        id?: string;
        type: string;
        lang?: string;
        streamType?: string;
        error?: StanzaError;
        payloadType?: string;
        bind?: Bind;
    }

    export interface Message {
        to?: string;
        from?: string;
        id?: string;
        lang?: string;
        streamType?: string;
        error?: StanzaError;
    }

    export interface Presence {
        to?: string;
        from?: string;
        id?: string;
        lang?: string;
        streamType?: string;
        error?: StanzaError;
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
        condition:
            | 'aborted'
            | 'account-disabled'
            | 'credentials-expired'
            | 'encryption-required'
            | 'incorrect-encoding'
            | 'invalid-authzid'
            | 'invalid-mechanism'
            | 'malformed-request'
            | 'mechanism-too-weak'
            | 'not-authorized'
            | 'temporary-auth-failure';
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
        alternateLanguageText: childAlternateLanguageText(NS_STANZAS, 'text'),
        condition: childEnum(
            NS_STREAM,
            [
                'bad-format',
                'bad-namespace-prefix',
                'conflict',
                'connection-timeout',
                'host-gone',
                'host-unknown',
                'improper-addressing',
                'internal-server-error',
                'invalid-from',
                'invalid-id',
                'invalid-namespace',
                'invalid-xml',
                'not-authorized',
                'not-well-formed',
                'policy-violation',
                'remote-connection-failed',
                'reset',
                'resource-constraint',
                'restricted-xml',
                'see-other-host',
                'system-shutdown',
                'undefined-condition',
                'unsupported-encoding',
                'unsupported-stanza-type',
                'unsupported-version'
            ],
            'undefined-condition'
        ),
        seeOtherHost: childText(NS_STREAM, 'see-other-host'),
        text: childText(NS_STANZAS, 'text')
    },
    namespace: NS_STREAM,
    path: 'streamError'
};

// --------------------------------------------------------------------

const _StanzaError: DefinitionOptions[] = STREAM_TYPES.map(([streamType, streamNS]) => ({
    aliases: ['stanzaError', 'message.error', 'presence.error', 'iq.error'],
    defaultType: NS_CLIENT,
    element: 'error',
    fields: {
        alternateLanguageText: childAlternateLanguageText(NS_STANZAS, 'text'),
        by: JIDAttribute('by'),
        condition: childEnum(
            NS_STANZAS,
            [
                'bad-request',
                'conflict',
                'feature-not-implemented',
                'forbidden',
                'gone',
                'internal-server-error',
                'item-not-found',
                'jid-malformed',
                'not-acceptable',
                'not-allowed',
                'not-authorized',
                'policy-violation',
                'recipient-unavailable',
                'redirect',
                'registration-required',
                'remote-server-not-found',
                'remote-server-timeout',
                'resource-constraint',
                'service-unavailable',
                'subscription-required',
                'undefined-condition',
                'unexpected-request'
            ],
            'undefined-condition'
        ),
        gone: childText(NS_STANZAS, 'gone'),
        redirect: childText(NS_STANZAS, 'redirect'),
        text: childText(NS_STANZAS, 'text'),
        type: attribute('type')
    },
    namespace: streamNS,
    type: streamType,
    typeField: 'streamType'
}));

// --------------------------------------------------------------------

const baseIQFields = new Set(['from', 'id', 'lang', 'to', 'type', 'payloadType', 'error']);
const _IQ: DefinitionOptions[] = STREAM_TYPES.map(([streamType, streamNS]) => ({
    defaultType: NS_CLIENT,
    element: 'iq',
    fields: {
        from: JIDAttribute('from'),
        id: attribute('id'),
        lang: languageAttribute(),
        payloadType: {
            order: -10000,
            importer(xml, context) {
                if ((context.data! as IQ).type !== 'get' && (context.data! as IQ).type !== 'set') {
                    return;
                }
                const childCount = xml.children.filter(child => typeof child !== 'string').length;
                if (childCount !== 1) {
                    return 'invalid-payload-count';
                }
                const extensions = Object.keys(context.data!).filter(key => !baseIQFields.has(key));
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
    type: streamType,
    typeField: 'streamType'
}));

// --------------------------------------------------------------------

const _Message: DefinitionOptions[] = STREAM_TYPES.map(([streamType, streamNS]) => ({
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
    type: streamType,
    typeField: 'streamType'
}));

// --------------------------------------------------------------------

const _Presence = STREAM_TYPES.map(([streamType, streamNS]) => ({
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
    type: streamType,
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
            condition: childEnum(NS_SASL, [
                'aborted',
                'account-disabled',
                'credentials-expired',
                'encryption-required',
                'incorrect-encoding',
                'invalid-authzid',
                'invalid-mechanism',
                'malformed-request',
                'mechanism-too-weak',
                'not-authorized',
                'temporary-auth-failure'
            ]),
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

export default [
    _Stream,
    _StreamFeatures,
    _StreamError,
    _StanzaError,
    _SASL,
    _STARTTLS,
    _Bind,
    _IQ,
    _Message,
    _Presence
] as DefinitionOptions[];
