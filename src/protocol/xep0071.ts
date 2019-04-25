// ====================================================================
// XEP-0071: XHTML-IM
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0071.html
// Version: 1.5.4 (2018-03-08)
// ====================================================================

import {
    childAlternateLanguageRawElement,
    childLanguageRawElement,
    DefinitionOptions,
    JSONElement,
    LanguageSet,
    XMLElement
} from '../jxt';

import { NS_XHTML, NS_XHTML_IM } from './Namespaces';

declare module './' {
    export interface Message {
        html?: XHTMLIM;
    }
}

export interface XHTMLIM {
    body?: XMLElement;
    alternateLanguageBodies?: LanguageSet<JSONElement | string>;
}

export default {
    element: 'html',
    fields: {
        alternateLanguageBodies: childAlternateLanguageRawElement(NS_XHTML, 'body', 'xhtmlim'),
        body: childLanguageRawElement(NS_XHTML, 'body', 'xhtmlim')
    },
    namespace: NS_XHTML_IM,
    path: 'message.html'
} as DefinitionOptions;
