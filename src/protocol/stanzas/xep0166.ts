// ====================================================================
// XEP-0166: Jingle
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0166.html
// Version: 1.1.1 (2016-05-17)
//
// Additional:
// - Added unknown-content error
// ====================================================================

import { attribute, childEnum, childText, DefinitionOptions } from '../../jxt';

import { NS_JINGLE_1, NS_JINGLE_ERRORS_1 } from './namespaces';
import { extendStanzaError, JID, JIDAttribute } from './util';

declare module './rfc6120' {
    export interface IQ {
        jingle?: Jingle;
    }
}

export interface Jingle {
    action:
        | 'session-initiate'
        | 'session-accept'
        | 'session-terminate'
        | 'content-add'
        | 'content-accept'
        | 'content-reject'
        | 'content-remove'
        | 'content-modify'
        | 'transport-replace'
        | 'transport-accept'
        | 'transport-reject'
        | 'transport-info'
        | 'description-info'
        | 'security-info'
        | 'session-info';
    initiator?: JID;
    responder?: JID;
    sid: string;
    contents?: JingleContent[];
    reason?: JingleReason;
}

export interface JingleContent {
    creator: 'initiator' | 'responder';
    name: string;
    disposition?: string;
    senders?: 'initiator' | 'responder' | 'both' | 'none';
    application?: JingleApplication;
    transport?: JingleTransport;
    security?: JingleSecurity;
}

export interface JingleReason {
    condition:
        | 'alternative-session'
        | 'busy'
        | 'cancel'
        | 'connectivity-error'
        | 'decline'
        | 'expired'
        | 'failed-application'
        | 'failed-transport'
        | 'general-error'
        | 'gone'
        | 'incompatible-parameters'
        | 'media-error'
        | 'security-error'
        | 'success'
        | 'timeout'
        | 'unsupported-applications'
        | 'unsupported-transports';
    alternativeSession?: string;
    text?: string;
}

export interface JingleApplication {
    applicationType: string;
}

export interface JingleTransport {
    transportType: string;
}

export interface JingleSecurity {
    securityType: string;
}

export default [
    extendStanzaError({
        jingleError: childEnum(NS_JINGLE_ERRORS_1, [
            'out-of-order',
            'tie-break',
            'unknown-session',
            'unknown-content',
            'unsupported-info'
        ])
    }),
    {
        element: 'jingle',
        fields: {
            action: attribute('action'),
            initiator: JIDAttribute('initiator'),
            responder: JIDAttribute('responder'),
            sid: attribute('sid')
        },
        namespace: NS_JINGLE_1,
        path: 'iq.jingle'
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents'
            }
        ],
        element: 'content',
        fields: {
            creator: attribute('creator'),
            disposition: attribute('disposition', 'session'),
            name: attribute('name'),
            senders: attribute('senders', 'both')
        },
        namespace: NS_JINGLE_1
    },
    {
        element: 'reason',
        fields: {
            alternativeSession: childText(null, 'alternative-session'),
            condition: childEnum(null, [
                'alternative-session',
                'busy',
                'cancel',
                'connectivity-error',
                'decline',
                'expired',
                'failed-application',
                'failed-transport',
                'general-error',
                'gone',
                'incompatible-parameters',
                'media-error',
                'security-error',
                'success',
                'timeout',
                'unsupported-applications',
                'unsupported-transports'
            ]),
            text: childText(null, 'text')
        },
        namespace: NS_JINGLE_1,
        path: 'iq.jingle.reason'
    }
] as DefinitionOptions[];
