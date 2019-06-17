// ====================================================================
// RFC 6121: Extensible Messaging and Presence Protocol (XMPP):
//      Instant Messaging and Presence
// --------------------------------------------------------------------
// Source: https://tools.ietf.org/html/rfc6121
// ====================================================================

import {
    attribute,
    booleanAttribute,
    childAlternateLanguageText,
    childAttribute,
    childBoolean,
    childInteger,
    childText,
    DefinitionOptions,
    LanguageSet,
    multipleChildText
} from '../jxt';

import { NS_ROSTER, NS_ROSTER_VERSIONING, NS_SUBSCRIPTION_PREAPPROVAL } from '../Namespaces';

import { extendMessage, extendPresence, extendStreamFeatures, JIDAttribute } from './util';

declare module './' {
    export interface StreamFeatures {
        rosterVersioning?: boolean;
        rosterPreApproval?: boolean;
    }

    export interface Message {
        type?: 'normal' | 'chat' | 'groupchat' | 'headline' | 'error';
        body?: string;
        alternateLanguageBodies?: LanguageSet<string>;
        alternateLanguageSubjects?: LanguageSet<string>;
        hasSubject?: boolean;
        subject?: string;
        thread?: string;
        parentThread?: string;
    }

    export interface Presence {
        type?:
            | 'error'
            | 'probe'
            | 'subscribe'
            | 'subscribed'
            | 'unavailable'
            | 'unsubscribe'
            | 'unsubscribed';
        show?: 'away' | 'chat' | 'dnd' | 'xa';
        status?: string;
        alternateLanguageStatuses?: LanguageSet<string>;
        priority?: number;
    }

    export interface IQ {
        roster?: Roster;
    }
}

export interface Roster {
    version?: string;
    items?: RosterItem[];
}
export interface RosterResult extends Roster {
    items: RosterItem[];
}
export interface RosterItem {
    jid: string;
    name?: string;
    subscription: 'to' | 'from' | 'both' | 'none' | 'remove';
    approved?: boolean;
    ask?: boolean;
    groups?: string[];
}

export default [
    extendStreamFeatures({
        rosterPreApproval: childBoolean(NS_SUBSCRIPTION_PREAPPROVAL, 'sub'),
        rosterVersioning: childBoolean(NS_ROSTER_VERSIONING, 'ver')
    }),
    extendMessage({
        alternateLanguageBodies: childAlternateLanguageText(null, 'body'),
        alternateLanguageSubjects: childAlternateLanguageText(null, 'subject'),
        body: childText(null, 'body'),
        hasSubject: childBoolean(null, 'subject'),
        parentThread: childAttribute(null, 'thread', 'parent'),
        subject: childText(null, 'subject'),
        thread: childText(null, 'thread'),
        type: attribute('type')
    }),
    extendPresence({
        alternateLanguageStatuses: childAlternateLanguageText(null, 'status'),
        priority: childInteger(null, 'priority', 0),
        show: childText(null, 'show'),
        status: childText(null, 'status'),
        type: attribute('type')
    }),
    {
        element: 'query',
        fields: {
            version: attribute('ver', undefined, true)
        },
        namespace: NS_ROSTER,
        path: 'iq.roster'
    },
    {
        aliases: [{ path: 'iq.roster.items', multiple: true }],
        element: 'item',
        fields: {
            approved: booleanAttribute('approved'),
            ask: booleanAttribute('ask'),
            groups: multipleChildText(null, 'group'),
            jid: JIDAttribute('jid'),
            name: attribute('name'),
            subscription: attribute('subscription')
        },
        namespace: NS_ROSTER
    }
] as DefinitionOptions[];
