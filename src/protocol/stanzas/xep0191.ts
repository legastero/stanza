// ====================================================================
// XEP-0191: Blocking Command
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0199.html
// Version: 1.3 (2015-03-12)
// ====================================================================

import { childBoolean, DefinitionOptions, multipleChildAttribute } from '../../jxt';

import { NS_BLOCKING, NS_BLOCKING_ERRORS } from '../Namespaces';
import './rfc6120';
import { extendStanzaError, JID } from './util';

declare module './rfc6120' {
    export interface IQ {
        blockList?: Blocking;
    }

    export interface StanzaError {
        blocked?: boolean;
    }
}

export interface Blocking {
    action: 'list' | 'block' | 'unblock';
    jids?: JID[];
}

export default [
    extendStanzaError({
        blocked: childBoolean(NS_BLOCKING_ERRORS, 'blocked')
    }),
    {
        element: 'blocklist',
        fields: {
            jids: multipleChildAttribute(null, 'item', 'jid')
        },
        namespace: NS_BLOCKING,
        path: 'iq.blockList',
        type: 'list',
        typeField: 'action'
    },
    {
        element: 'block',
        fields: {
            jids: multipleChildAttribute(null, 'item', 'jid')
        },
        namespace: NS_BLOCKING,
        path: 'iq.blockList',
        type: 'block',
        typeField: 'action'
    },
    {
        element: 'unblock',
        fields: {
            jids: multipleChildAttribute(null, 'item', 'jid')
        },
        namespace: NS_BLOCKING,
        path: 'iq.blockList',
        type: 'unblock',
        typeField: 'action'
    }
] as DefinitionOptions[];
