// ====================================================================
// XEP-0177: Jingle Raw UDP Transport Method
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0177.html
// Version: 1.1 (2009-12-23)
// ====================================================================

import { attribute, childBoolean, DefinitionOptions, integerAttribute } from '../jxt';

import { JingleTransport } from './';
import { NS_JINGLE_RAW_UDP_1 } from './Namespaces';

export interface JingleRawUdp extends JingleTransport {
    transportType: typeof NS_JINGLE_RAW_UDP_1;
    candidates?: JingleRawUdpCandidate[];
}

export interface JingleRawUdpCandidate {
    component: string;
    foundation: string;
    id: string;
    ip: string;
    port: number;
    type: 'host' | 'prflx' | 'srflx' | 'relay';
}

export default [
    {
        element: 'transport',
        fields: {
            gatheringComplete: childBoolean(null, 'gathering-complete'),
            password: attribute('pwd'),
            usernameFragment: attribute('ufrag')
        },
        namespace: NS_JINGLE_RAW_UDP_1,
        path: 'iq.jingle.contents.transport',
        type: NS_JINGLE_RAW_UDP_1,
        typeField: 'transportType'
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents.transport.candidates',
                selector: NS_JINGLE_RAW_UDP_1
            }
        ],
        element: 'candidate',
        fields: {
            component: attribute('component'),
            foundation: attribute('foundation'),
            generation: attribute('generation'),
            id: attribute('id'),
            ip: attribute('ip'),
            port: integerAttribute('port'),
            type: attribute('type')
        },
        namespace: NS_JINGLE_RAW_UDP_1
    }
] as DefinitionOptions[];
