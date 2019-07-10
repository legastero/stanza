// ====================================================================
// XEP-0166: Jingle
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0166.html
// Version: 1.1.1 (2016-05-17)
//
// Additional:
// - Added unknown-content error
// ====================================================================

import {
    JingleAction,
    JingleContentSenders,
    JingleErrorCondition,
    JingleReasonCondition,
    JingleSessionRole,
    toList
} from '../Constants';
import { JID } from '../JID';
import {
    attribute,
    childEnum,
    childText,
    DefinitionOptions,
    extendStanzaError,
    JIDAttribute
} from '../jxt';
import { NS_JINGLE_1, NS_JINGLE_ERRORS_1 } from '../Namespaces';

declare module './' {
    export interface IQPayload {
        jingle?: Jingle;
    }

    export interface StanzaError {
        jingleError?: JingleErrorCondition;
    }
}

export interface Jingle {
    action: JingleAction;
    initiator?: JID;
    responder?: JID;
    sid: string;
    contents?: JingleContent[];
    reason?: JingleReason;
    info?: JingleInfo;
}

export interface JingleContent {
    creator: JingleSessionRole;
    name: string;
    disposition?: string;
    senders?: JingleContentSenders;
    application?: JingleApplication;
    transport?: JingleTransport;
    security?: JingleSecurity;
}

export interface JingleReason {
    condition: JingleReasonCondition;
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

export interface JingleInfo {
    infoType: string;
    creator?: JingleSessionRole;
    name?: string;
}

const Protocol: DefinitionOptions[] = [
    extendStanzaError({
        jingleError: childEnum(NS_JINGLE_ERRORS_1, toList(JingleErrorCondition))
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
            condition: childEnum(null, toList(JingleReasonCondition)),
            text: childText(null, 'text')
        },
        namespace: NS_JINGLE_1,
        path: 'iq.jingle.reason'
    }
];
export default Protocol;
