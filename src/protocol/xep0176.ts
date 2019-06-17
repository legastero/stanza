// ====================================================================
// XEP-0176: Jingle ICE-UDP Transport Method
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0176.html
// Version: 1.0 (2009-06-10)
//
// Additional:
// - tcpType candidate attribute (matching XEP-0371)
// - gatheringComplete flag (matching XEP-0371)
// ====================================================================

import { attribute, childBoolean, DefinitionOptions, integerAttribute } from '../jxt';
import { NS_JINGLE_ICE_UDP_1 } from '../Namespaces';

import { JingleTransport } from './';

export interface JingleIceUdp extends JingleTransport {
    transportType: typeof NS_JINGLE_ICE_UDP_1;
    password?: string;
    usernameFragment?: string;
    gatheringComplete?: boolean;
    remoteCandidate?: JingleIceUdpRemoteCandidate;
    candidates?: JingleIceUdpCandidate[];
}

export interface JingleIceUdpCandidate {
    component: number;
    generation?: number;
    foundation: string;
    id?: string;
    ip: string;
    network?: number;
    port: number;
    priority: number;
    protocol?: 'tcp' | 'udp';
    relatedAddress?: string;
    relatedPort?: number;
    tcpType?: 'active' | 'passive' | 'so';
    type: 'host' | 'prflx' | 'srflx' | 'relay';
}

export interface JingleIceUdpRemoteCandidate {
    component: number;
    ip: string;
    port: number;
}

export default [
    {
        element: 'transport',
        fields: {
            gatheringComplete: childBoolean(null, 'gathering-complete'),
            password: attribute('pwd'),
            usernameFragment: attribute('ufrag')
        },
        namespace: NS_JINGLE_ICE_UDP_1,
        path: 'iq.jingle.contents.transport',
        type: NS_JINGLE_ICE_UDP_1,
        typeField: 'transportType'
    },
    {
        aliases: [
            {
                path: 'iq.jingle.contents.transport.remoteCandidate',
                selector: NS_JINGLE_ICE_UDP_1
            }
        ],
        element: 'remote-candidate',
        fields: {
            component: integerAttribute('component'),
            ip: attribute('ip'),
            port: integerAttribute('port')
        },
        namespace: NS_JINGLE_ICE_UDP_1
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents.transport.candidates',
                selector: NS_JINGLE_ICE_UDP_1
            }
        ],
        element: 'candidate',
        fields: {
            component: integerAttribute('component'),
            foundation: attribute('foundation'),
            generation: integerAttribute('generation'),
            id: attribute('id'),
            ip: attribute('ip'),
            network: integerAttribute('network'),
            port: integerAttribute('port'),
            priority: integerAttribute('priority'),
            protocol: attribute('protocol'),
            relatedAddress: attribute('rel-addr'),
            relatedPort: attribute('rel-port'),
            tcpType: attribute('tcptype'),
            type: attribute('type')
        },
        namespace: NS_JINGLE_ICE_UDP_1
    }
] as DefinitionOptions[];
