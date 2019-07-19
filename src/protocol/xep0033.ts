// ====================================================================
// XEP-0033: Extended Stanza Addressing
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0033.html
// Version:	1.2.1 (2017-01-11)
// --------------------------------------------------------------------

import { JID } from '../JID';
import {
    attribute,
    booleanAttribute,
    childAlternateLanguageText,
    DefinitionOptions,
    extendMessage,
    extendPresence,
    JIDAttribute,
    LanguageSet,
    splicePath
} from '../jxt';
import { NS_ADDRESS } from '../Namespaces';

declare module './' {
    export interface Message {
        addresses?: ExtendedAddress[];
    }
    export interface Presence {
        addresses?: ExtendedAddress[];
    }
}

export interface ExtendedAddress {
    type: string;
    jid?: JID;
    uri?: string;
    node?: string;
    description?: string;
    alternateLanguageDescriptions?: LanguageSet<string>;
    delivered?: boolean;
}

const Protocol: DefinitionOptions[] = [
    extendMessage({
        addresses: splicePath(NS_ADDRESS, 'addresses', 'extendedAddress', true)
    }),
    extendPresence({
        addresses: splicePath(NS_ADDRESS, 'addresses', 'extendedAddress', true)
    }),
    {
        element: 'address',
        fields: {
            alternateLanguageDescriptions: childAlternateLanguageText(null, 'desc'),
            delivered: booleanAttribute('delivered'),
            description: attribute('desc'),
            jid: JIDAttribute('jid'),
            node: attribute('node'),
            type: attribute('type'),
            uri: attribute('uri')
        },
        namespace: NS_ADDRESS,
        path: 'extendedAddress'
    }
];
export default Protocol;
