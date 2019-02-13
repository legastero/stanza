// ====================================================================
// XEP-0144: Roster Item Exchange
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0144.html
// Version: 1.1.1 (2017-11-28)
// ====================================================================

import { attribute, DefinitionOptions, multipleChildText, splicePath } from '../../jxt';

import { NS_ROSTER_EXCHANGE } from '../Namespaces';
import './rfc6120';
import { extendIQ, extendMessage, JID, JIDAttribute } from './util';

declare module './rfc6120' {
    export interface Message {
        rosterExchange?: RosterExchange[];
    }

    export interface IQ {
        rosterExchange?: RosterExchange[];
    }
}

export interface RosterExchange {
    action: 'add' | 'delete' | 'modify';
    jid: JID;
    name?: string;
    groups?: string[];
}

export default [
    extendMessage({
        rosterExchange: splicePath(NS_ROSTER_EXCHANGE, 'x', 'rosterExchange', true)
    }),
    extendIQ({
        rosterExchange: splicePath(NS_ROSTER_EXCHANGE, 'x', 'rosterExchange', true)
    }),
    {
        element: 'item',
        fields: {
            action: attribute('action'),
            groups: multipleChildText(null, 'group'),
            jid: JIDAttribute('jid'),
            name: attribute('name')
        },
        namespace: NS_ROSTER_EXCHANGE,
        path: 'rosterExchange'
    }
] as DefinitionOptions[];
