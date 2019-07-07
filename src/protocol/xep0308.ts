// ====================================================================
// XEP-0308: Last Message Correction
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0308.html
// Version: 1.0 (2013-04-08)
// ====================================================================

import { childAttribute, extendMessage } from '../jxt';
import { NS_CORRECTION_0 } from '../Namespaces';

declare module './' {
    export interface Message {
        replace?: string;
    }
}

export default extendMessage({
    replace: childAttribute(NS_CORRECTION_0, 'replace', 'id')
});
