// ====================================================================
// XEP-0260: Jingle SOCKS5 Bytestreams Transport Method
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0260.html
// Version: 1.0.1 (2016-05-17)
// ====================================================================

import {
    attribute,
    childAttribute,
    childBoolean,
    DefinitionOptions,
    integerAttribute
} from '../jxt';
import { NS_JINGLE_SOCKS5_1 } from '../Namespaces';

import { JingleTransport } from './';
import { JIDAttribute } from './util';

export interface JingleSocks5 extends JingleTransport {
    transportType: typeof NS_JINGLE_SOCKS5_1;
    sid: string;
    mode?: 'tcp' | 'udp';
    address?: string;
    activated?: string;
    candidateUsed?: string;
    candidateError?: boolean;
    proxyError?: boolean;
    candidates?: JingleSocks5Candidate[];
}

export interface JingleSocks5Candidate {
    cid: string;
    host?: string;
    port?: number;
    uri?: string;
    priority?: number;
    type?: string;
}

export default [
    {
        element: 'transport',
        fields: {
            activated: childAttribute(null, 'activated', 'cid'),
            address: attribute('dstaddr'),
            candidateError: childBoolean(null, 'candidate-error'),
            candidateUsed: childAttribute(null, 'candidate-used', 'cid'),
            mode: attribute('mode', 'tcp'),
            proxyError: childBoolean(null, 'proxy-error'),
            sid: attribute('sid')
        },
        namespace: NS_JINGLE_SOCKS5_1,
        path: 'iq.jingle.contents.transport',
        type: NS_JINGLE_SOCKS5_1,
        typeField: 'transportType'
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents.transport.candidates',
                selector: NS_JINGLE_SOCKS5_1
            }
        ],
        element: 'candidate',
        fields: {
            cid: attribute('cid'),
            host: attribute('host'),
            jid: JIDAttribute('jid'),
            port: integerAttribute('port'),
            priority: integerAttribute('priority'),
            type: attribute('type'),
            uri: attribute('uri')
        },
        namespace: NS_JINGLE_SOCKS5_1
    }
] as DefinitionOptions[];
