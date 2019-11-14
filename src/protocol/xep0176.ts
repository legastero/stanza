// ====================================================================
// XEP-0176: Jingle ICE-UDP Transport Method
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0176.html
// Version: 1.0 (2009-06-10)
//
// Additional:
// - tcpType candidate attribute (matching XEP-0371)
// - gatheringComplete flag (matching XEP-0371)
//
// --------------------------------------------------------------------
// XEP-0371: Jingle ICE-UDP Transport Method
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0371.html
// Version: 0.2 (2017-09-11)
// ====================================================================

import { attribute, childBoolean, DefinitionOptions, integerAttribute } from '../jxt';
import { NS_JINGLE_ICE_0, NS_JINGLE_ICE_UDP_1 } from '../Namespaces';

import { JingleTransport } from './';

export interface JingleIce extends JingleTransport {
    transportType: typeof NS_JINGLE_ICE_0 | typeof NS_JINGLE_ICE_UDP_1;
    password?: string;
    usernameFragment?: string;
    gatheringComplete?: boolean;
    remoteCandidate?: JingleIceRemoteCandidate;
    candidates?: JingleIceCandidate[];
}

export interface JingleIceCandidate {
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

export interface JingleIceRemoteCandidate {
    component: number;
    ip: string;
    port: number;
}

const ice = (transportType: string): DefinitionOptions[] => [
    {
        element: 'transport',
        fields: {
            gatheringComplete: childBoolean(null, 'gathering-complete'),
            password: attribute('pwd'),
            usernameFragment: attribute('ufrag')
        },
        namespace: transportType,
        path: 'iq.jingle.contents.transport',
        type: transportType,
        typeField: 'transportType'
    },
    {
        aliases: [
            {
                impliedType: true,
                path: 'iq.jingle.contents.transport.remoteCandidate',
                selector: transportType
            }
        ],
        element: 'remote-candidate',
        fields: {
            component: integerAttribute('component'),
            ip: attribute('ip'),
            port: integerAttribute('port')
        },
        namespace: transportType,
        type: transportType,
        typeField: 'transportType'
    },
    {
        aliases: [
            {
                impliedType: true,
                multiple: true,
                path: 'iq.jingle.contents.transport.candidates',
                selector: transportType
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
        namespace: transportType,
        type: transportType,
        typeField: 'transportType'
    }
];

const Protocol: DefinitionOptions[] = [...ice(NS_JINGLE_ICE_0), ...ice(NS_JINGLE_ICE_UDP_1)];
export default Protocol;
