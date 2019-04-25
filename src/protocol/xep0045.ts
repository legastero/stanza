// ====================================================================
// XEP-0045: Multi-User Chat
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0045.html
// Version: 1.31.1 (2018-03-12)
//
// Additional:
// --------------------------------------------------------------------
// XEP-0249: Direct MUC Invitations
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0249.html
// Version: 1.2 (2011-09-22)
//
// --------------------------------------------------------------------
// XEP-0307: Unique Room Names for Multi-User Chat
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0307.html
// Version: 0.1 (2011-11-10)
// ====================================================================

import {
    attribute,
    childAttribute,
    childBoolean,
    childEnum,
    childText,
    dateAttribute,
    DefinitionOptions,
    integerAttribute,
    multipleChildAttribute,
    staticValue,
    text
} from '../jxt';

import {
    NS_DATAFORM,
    NS_MUC,
    NS_MUC_ADMIN,
    NS_MUC_DIRECT_INVITE,
    NS_MUC_OWNER,
    NS_MUC_UNIQUE,
    NS_MUC_USER
} from './Namespaces';
import { addAlias, JID, JIDAttribute } from './util';
import { DataForm } from './xep0004';

declare module './' {
    export interface Presence {
        muc?: MUCJoin | MUCInfo;
    }

    export interface Message {
        muc?: MUCInfo | MUCDirectInvite;
    }

    export interface IQ {
        muc?: MUCConfigure | MUCUserList | MUCUnique;
    }
}

export interface MUCJoin {
    type: 'join';
    password?: string;
    history?: MUCHistory;
}

export interface MUCInfo {
    type: 'info';
    action?: 'invite' | 'decline' | 'destroy';
    password?: string;
    statusCodes?: string[];
    user?: MUCUserItem;
    destroy?: MUCDestroy;
    invite?: MUCInvite[];
    decline?: MUCDecline;
}

export type MUCAffiliation = 'owner' | 'admin' | 'member' | 'outcast' | 'none';
export type MUCRole = 'moderator' | 'participant' | 'visitor' | 'none';

export interface MUCUserItem {
    affiliation?: MUCAffiliation;
    role?: MUCRole;
    jid?: JID;
    nick?: string;
    reason?: string;
    actor?: MUCActor;
}

export interface MUCActor {
    nick?: string;
    jid?: JID;
}

export interface MUCHistory {
    maxCharacters?: number;
    maxStanzas?: number;
    seconds?: number;
    since?: Date;
}

export interface MUCInvite {
    to?: JID;
    from?: JID;
    reason?: string;
    thread?: string;
    continue?: boolean;
}

export interface MUCDirectInvite {
    type: 'direct-invite';
    action?: 'invite';
    jid?: JID;
    password?: string;
    reason?: string;
    thread?: string;
    continue?: boolean;
}

export interface MUCDecline {
    to?: JID;
    from?: JID;
    reason?: string;
}

export interface MUCUserList {
    type: 'user-list';
    users?: MUCUserItem[];
}

export interface MUCConfigure {
    type: 'configure';
    form?: DataForm;
    destroy?: MUCDestroy;
}

export interface MUCDestroy {
    jid?: JID;
    password?: string;
    reason?: string;
}

export interface MUCUnique {
    type: 'unique';
    name?: string;
}

export default [
    addAlias(NS_DATAFORM, 'x', [{ path: 'iq.muc.form', selector: 'configure' }]),
    {
        defaultType: 'info',
        element: 'x',
        fields: {
            password: childText(null, 'password')
        },
        namespace: NS_MUC,
        path: 'presence.muc',
        type: 'join',
        typeField: 'type'
    },
    {
        aliases: [{ path: 'presence.muc.history', selector: 'join' }],
        element: 'history',
        fields: {
            maxCharacters: integerAttribute('maxchars'),
            maxStanzas: integerAttribute('maxstanzas'),
            seconds: integerAttribute('seconds'),
            since: dateAttribute('since')
        },
        namespace: NS_MUC
    },
    {
        aliases: ['presence.muc', 'message.muc'],
        defaultType: 'info',
        element: 'x',
        fields: {
            action: childEnum(null, ['invite', 'decline', 'destroy']),
            password: childText(null, 'password'),
            statusCodes: multipleChildAttribute(null, 'status', 'code')
        },
        namespace: NS_MUC_USER,
        type: 'info',
        typeField: 'type'
    },
    {
        aliases: [
            { path: 'presence.muc.user', selector: 'info' },
            { path: 'message.muc.user', selector: 'info' }
        ],
        element: 'item',
        fields: {
            affiliation: attribute('affiliation'),
            jid: JIDAttribute('jid'),
            nick: attribute('nick'),
            reason: childText(null, 'reason'),
            role: attribute('role')
        },
        namespace: NS_MUC_USER
    },
    {
        aliases: ['presence.muc.user.actor', 'message.muc.user.actor'],
        element: 'actor',
        fields: {
            jid: JIDAttribute('jid'),
            nick: attribute('nick')
        },
        namespace: NS_MUC_USER
    },
    {
        element: 'destroy',
        fields: {
            jid: JIDAttribute('jid'),
            reason: childText(null, 'reason')
        },
        namespace: NS_MUC_USER,
        path: 'presence.muc.destroy'
    },
    {
        aliases: [{ path: 'message.muc.invite', multiple: true }],
        element: 'invite',
        fields: {
            continue: childBoolean(null, 'continue'),
            from: JIDAttribute('from'),
            reason: childText(null, 'reason'),
            thread: childAttribute(null, 'continue', 'thread'),
            to: JIDAttribute('to')
        },
        namespace: NS_MUC_USER
    },
    {
        element: 'decline',
        fields: {
            from: JIDAttribute('from'),
            reason: childText(null, 'reason'),
            to: JIDAttribute('to')
        },
        namespace: NS_MUC_USER,
        path: 'message.muc',
        type: 'decline'
    },
    {
        element: 'query',
        namespace: NS_MUC_ADMIN,
        path: 'iq.muc',
        type: 'user-list',
        typeField: 'type'
    },
    {
        aliases: [{ path: 'iq.muc.users', multiple: true, selector: 'user-list' }],
        element: 'item',
        fields: {
            affiliation: attribute('affiliation'),
            jid: JIDAttribute('jid'),
            nick: attribute('nick'),
            reason: childText(null, 'reason'),
            role: attribute('role')
        },
        namespace: NS_MUC_ADMIN
    },
    {
        aliases: ['iq.muc.users.actor'],
        element: 'actor',
        fields: {
            jid: JIDAttribute('jid'),
            nick: attribute('nick')
        },
        namespace: NS_MUC_ADMIN
    },
    {
        element: 'query',
        namespace: NS_MUC_OWNER,
        path: 'iq.muc',
        type: 'configure',
        typeField: 'type'
    },
    {
        aliases: [{ path: 'iq.muc.destroy', selector: 'configure' }],
        element: 'destroy',
        fields: {
            jid: JIDAttribute('jid'),
            password: childText(null, 'password'),
            reason: childText(null, 'reason')
        },
        namespace: NS_MUC_OWNER
    },

    // XEP-0297
    {
        element: 'x',
        fields: {
            action: staticValue('invite'),
            continue: attribute('continue'),
            jid: JIDAttribute('jid'),
            password: attribute('password'),
            reason: attribute('reason'),
            thread: attribute('thread')
        },
        namespace: NS_MUC_DIRECT_INVITE,
        path: 'message.muc',
        type: 'direct-invite'
    },

    // XEP-0307
    {
        element: 'unique',
        fields: {
            name: text()
        },
        namespace: NS_MUC_UNIQUE,
        path: 'iq.muc',
        type: 'unique'
    }
] as DefinitionOptions[];
