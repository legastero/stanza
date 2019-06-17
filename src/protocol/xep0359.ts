// ====================================================================
// XEP-0359: Unique and Stable Stanza IDs
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0359.html
// Version: 0.5.0 (2017-08-23)
// ====================================================================

import { attribute, childAttribute, DefinitionOptions } from '../jxt';

import { NS_SID_0 } from '../Namespaces';

import { extendMessage, JID, JIDAttribute } from './util';

declare module './' {
    export interface Message {
        originId?: string;
        stanzaIds?: StanzaId[];
    }
}

export interface StanzaId {
    id: string;
    by: JID;
}

export default [
    extendMessage({
        originId: childAttribute(NS_SID_0, 'origin-id', 'id')
    }),
    {
        aliases: [{ path: 'message.stanzaIds', multiple: true }],
        element: 'stanza-id',
        fields: {
            by: JIDAttribute('by'),
            id: attribute('id')
        },
        namespace: NS_SID_0
    }
] as DefinitionOptions[];
