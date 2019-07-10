// ====================================================================
// XEP-0144: Roster Item Exchange
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0144.html
// Version: 1.1.1 (2017-11-28)
// ====================================================================

import { JID } from '../JID';
import {
    attribute,
    DefinitionOptions,
    extendIQ,
    extendMessage,
    JIDAttribute,
    multipleChildText,
    splicePath
} from '../jxt';
import { NS_ROSTER_EXCHANGE } from '../Namespaces';

declare module './' {
    export interface Message {
        rosterExchange?: RosterExchange[];
    }

    export interface IQPayload {
        rosterExchange?: RosterExchange[];
    }
}

export interface RosterExchange {
    action: 'add' | 'delete' | 'modify';
    jid: JID;
    name?: string;
    groups?: string[];
}

const Protocol: DefinitionOptions[] = [
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
];
export default Protocol;
