// ====================================================================
// XEP-0131: Stanza Headers and Internet Metadata
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0131.html
// Version: 1.2 (2006-07-12)
// ====================================================================

import {
    attribute,
    DefinitionOptions,
    extendMessage,
    extendPresence,
    splicePath,
    text
} from '../jxt';
import { NS_SHIM } from '../Namespaces';

declare module './' {
    export interface Message {
        headers?: StanzaHeader[];
    }

    export interface Presence {
        headers?: StanzaHeader[];
    }
}

export interface StanzaHeader {
    name: string;
    value?: string;
}

export default [
    extendMessage({
        headers: splicePath(NS_SHIM, 'headers', 'header', true)
    }),
    extendPresence({
        headers: splicePath(NS_SHIM, 'headers', 'header', true)
    }),
    {
        element: 'header',
        fields: {
            name: attribute('name'),
            value: text()
        },
        namespace: NS_SHIM,
        path: 'header'
    }
] as DefinitionOptions[];
