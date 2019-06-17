// ====================================================================
// RFC 3921: Extensible Messaging and Presence Protocol (XMPP): Core
// --------------------------------------------------------------------
// Source: https://tools.ietf.org/html/rfc3921
//
// Additional:
// --------------------------------------------------------------------
// draft-cridland-xmpp-session-01: Here Lies Extensible Messaging and
//      Presence Protocol (XMPP) Session Establishment
// -------------------------------------------------------------------
// Source: https://tools.ietf.org/html/draft-cridland-xmpp-session-01
// ====================================================================

import { childBoolean, DefinitionOptions } from '../jxt';

import { NS_SESSION } from '../Namespaces';

declare module './' {
    export interface StreamFeatures {
        legacySession?: SessionFeature;
    }

    export interface IQ {
        legacySession?: boolean;
    }
}

export interface SessionFeature {
    optional?: boolean;
}

export default {
    aliases: ['features.legacySession', 'iq.legacySession'],
    element: 'session',
    fields: {
        // draft-cridland-xmpp-session-01
        //
        // The <optional /> child is not yet standardized, but is
        // still widely deployed to reduce client start times.
        optional: childBoolean(null, 'optional')
    },
    namespace: NS_SESSION
} as DefinitionOptions;
