// ====================================================================
// XEP-0308: Last Message Correction
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0308.html
// Version: 1.0 (2013-04-08)
// ====================================================================

import { childAttribute, DefinitionOptions } from '../../jxt';

import { NS_CORRECTION_0 } from '../Namespaces';
import './rfc6120';
import { extendMessage } from './util';

declare module './rfc6120' {
    export interface Message {
        replace?: string;
    }
}

export default extendMessage({
    replace: childAttribute(NS_CORRECTION_0, 'replace', 'id')
});
