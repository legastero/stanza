// ====================================================================
// XEP-0319: Last User Interaction in Presence
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0313.html
// Version: 1.0.2 (2017-07-17)
// ====================================================================

import { childDate, DefinitionOptions } from '../jxt';

import { NS_IDLE_1 } from '../Namespaces';

import { extendPresence } from './util';

declare module './' {
    export interface Presence {
        idleSince?: Date;
    }
}

export default extendPresence({
    idleSince: childDate(NS_IDLE_1, 'since')
});
