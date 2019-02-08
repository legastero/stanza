// ====================================================================
// XEP-0231: Bits of Binary
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0231.html
// Version: Version 1.0 (2008-09-03)
// ====================================================================

import { attribute, DefinitionOptions, integerAttribute, textBuffer } from '../../jxt';

import { NS_BOB } from './namespaces';
import './rfc6120';

declare module './rfc6120' {
    export interface Message {
        bits?: Bits[];
    }

    export interface Presence {
        bits?: Bits[];
    }

    export interface IQ {
        bits?: Bits;
    }
}

export interface Bits {
    data?: Buffer;
    cid: string;
    maxAge?: number;
    mediaType?: string;
}

export default {
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
} as DefinitionOptions;
