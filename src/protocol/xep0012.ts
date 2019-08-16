// ====================================================================
// XEP-0012: Last Activity
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0012.html
// Version: 2.0 (2008-11-26)
//
// Additional:
// --------------------------------------------------------------------
// XEP-0256: Last Activity in Presence
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0256.html
// Version: 1.1 (2009-09-15)
// ====================================================================

import { DefinitionOptions, integerAttribute, text } from '../jxt';
import { NS_LAST_ACTIVITY } from '../Namespaces';

declare module './' {
    export interface IQPayload {
        lastActivity?: LastActivity;
    }
    export interface Presence {
        legacyLastActivity?: LastActivity;
    }
}

export interface LastActivity {
    seconds?: number;
    status?: string;
}

const Protocol: DefinitionOptions[] = [
    {
        aliases: ['presence.legacyLastActivity', 'iq.lastActivity'],
        element: 'query',
        fields: {
            seconds: integerAttribute('seconds'),
            status: text()
        },
        namespace: NS_LAST_ACTIVITY
    }
];
export default Protocol;
