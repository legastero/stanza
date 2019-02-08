// ====================================================================
// XEP-0199: XMPP Ping
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0199.html
// Version: 2.0 (2009-06-03)
// ====================================================================

import { childBoolean, DefinitionOptions } from '../../jxt';

import { NS_PING } from './namespaces';
import './rfc6120';
import { extendIQ } from './util';

declare module './rfc6120' {
    export interface IQ {
        ping?: boolean;
    }
}

export default extendIQ({
    ping: childBoolean(NS_PING, 'ping')
}) as DefinitionOptions;
