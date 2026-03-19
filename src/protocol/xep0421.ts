// ====================================================================
// XEP-0421: Occupant identifiers for semi-anonymous MUCs
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0421.html
// Version: 1.0.1 (2025-04-09)
// ====================================================================

import {
    childAttribute,
    DefinitionOptions,
    extendMessage,
    extendPresence
} from '../jxt';

import { NS_OCCUPANT_0 } from '../Namespaces';

declare module './' {
    export interface Presence {
        occupantId?: string;
    }
    export interface Message {
        occupantId?: string;
    }
}

const Protocol: DefinitionOptions[] = [
    extendPresence({
        occupantId: childAttribute(NS_OCCUPANT_0, 'occupant-id', 'id')
    }),
    extendMessage({
        occupantId: childAttribute(NS_OCCUPANT_0, 'occupant-id', 'id')
    })
];
export default Protocol;
