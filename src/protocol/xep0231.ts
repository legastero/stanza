// ====================================================================
// XEP-0231: Bits of Binary
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0231.html
// Version: Version 1.0 (2008-09-03)
// ====================================================================

import { attribute, DefinitionOptions, integerAttribute, textBuffer } from '../jxt';

import { NS_BOB } from '../Namespaces';

declare module './' {
    export interface Message {
        bits?: Bits[];
    }

    export interface Presence {
        bits?: Bits[];
    }

    export interface IQPayload {
        bits?: Bits;
    }
}

export interface Bits {
    data?: Buffer;
    cid: string;
    maxAge?: number;
    mediaType?: string;
}

const Protocol: DefinitionOptions = {
    aliases: [
        'iq.bits',
        { path: 'message.bits', multiple: true },
        { path: 'presence.bits', multiple: true },
        { path: 'iq.jingle.bits', multiple: true }
    ],
    element: 'data',
    fields: {
        cid: attribute('cid'),
        data: textBuffer('base64'),
        maxAge: integerAttribute('max-age'),
        mediaType: attribute('type')
    },
    namespace: NS_BOB
};
export default Protocol;
