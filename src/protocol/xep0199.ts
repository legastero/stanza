// ====================================================================
// XEP-0199: XMPP Ping
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0199.html
// Version: 2.0 (2009-06-03)
// ====================================================================

import { childBoolean, extendIQ } from '../jxt';
import { NS_PING } from '../Namespaces';

declare module './' {
    export interface IQPayload {
        ping?: boolean;
    }
}

export default extendIQ({
    ping: childBoolean(NS_PING, 'ping')
});
