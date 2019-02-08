// ====================================================================
// XEP-0203: Delayed Delivery
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0203.html
// Version: 2.0 (2009-09-15)
// ====================================================================

import { dateAttribute, DefinitionOptions, text } from '../../jxt';

import { NS_DELAY } from './namespaces';
import './rfc6120';
import { JIDAttribute } from './util';

declare module './rfc6120' {
    export interface Message {
        delay?: Delay;
    }
    export interface Presence {
        delay?: Delay;
    }
}

export interface Delay {
    from?: string;
    timestamp: Date;
    reason?: string;
}

export default {
    aliases: ['message.delay', 'presence.delay'],
    element: 'delay',
    fields: {
        from: JIDAttribute('from'),
        reason: text(),
        timestamp: dateAttribute('stamp')
    },
    namespace: NS_DELAY
} as DefinitionOptions;
