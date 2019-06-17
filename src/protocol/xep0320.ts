// ====================================================================
// XEP-0320: Use of DTLS-SRTP in Jingle Sessions
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0320.html
// Version: 0.3.1 (2015-10-15)
// ====================================================================

import { attribute, DefinitionOptions, text } from '../jxt';

import { NS_JINGLE_DTLS_0, NS_JINGLE_ICE_UDP_1, NS_JINGLE_RTP_1 } from '../Namespaces';

export interface JingleDtlsFingerprint {
    algorithm?: string;
    setup?: string;
    value?: string;
}

declare module './xep0176' {
    export interface JingleIceUdp {
        fingerprints?: JingleDtlsFingerprint[];
    }
}

export default {
    aliases: [
        {
            multiple: true,
            path: 'iq.jingle.contents.transport.fingerprints',
            selector: NS_JINGLE_ICE_UDP_1
        },
        {
            multiple: true,
            path: 'iq.jingle.contents.application.encryption.dtls',
            selector: NS_JINGLE_RTP_1
        }
    ],
    element: 'fingerprint',
    fields: {
        algorithm: attribute('hash'),
        setup: attribute('setup'),
        value: text()
    },
    namespace: NS_JINGLE_DTLS_0
} as DefinitionOptions;
