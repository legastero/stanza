import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const ICE = JXT.define({
        element: 'transport',
        fields: {
            gatheringComplete: Utils.boolSub(NS.JINGLE_ICE_UDP_1, 'gathering-complete'),
            pwd: Utils.attribute('pwd'),
            transportType: {
                value: 'iceUdp',
                writable: true
            },
            ufrag: Utils.attribute('ufrag')
        },
        name: '_iceUdp',
        namespace: NS.JINGLE_ICE_UDP_1,
        tags: ['jingle-transport']
    });

    const RemoteCandidate = JXT.define({
        element: 'remote-candidate',
        fields: {
            component: Utils.attribute('component'),
            ip: Utils.attribute('ip'),
            port: Utils.attribute('port')
        },
        name: 'remoteCandidate',
        namespace: NS.JINGLE_ICE_UDP_1
    });

    const Candidate = JXT.define({
        element: 'candidate',
        fields: {
            component: Utils.attribute('component'),
            foundation: Utils.attribute('foundation'),
            generation: Utils.attribute('generation'),
            id: Utils.attribute('id'),
            ip: Utils.attribute('ip'),
            network: Utils.attribute('network'),
            port: Utils.attribute('port'),
            priority: Utils.attribute('priority'),
            protocol: Utils.attribute('protocol'),
            relAddr: Utils.attribute('rel-addr'),
            relPort: Utils.attribute('rel-port'),
            tcpType: Utils.attribute('tcptype'),
            type: Utils.attribute('type')
        },
        name: '_iceUdpCandidate',
        namespace: NS.JINGLE_ICE_UDP_1
    });

    const Fingerprint = JXT.define({
        element: 'fingerprint',
        fields: {
            hash: Utils.attribute('hash'),
            required: Utils.boolAttribute('required'),
            setup: Utils.attribute('setup'),
            value: Utils.text()
        },
        name: '_iceFingerprint',
        namespace: NS.JINGLE_DTLS_0
    });

    const SctpMap = JXT.define({
        element: 'sctpmap',
        fields: {
            number: Utils.attribute('number'),
            protocol: Utils.attribute('protocol'),
            streams: Utils.attribute('streams')
        },
        name: '_sctpMap',
        namespace: NS.DTLS_SCTP_1
    });

    JXT.extend(ICE, Candidate, 'candidates');
    JXT.extend(ICE, RemoteCandidate);
    JXT.extend(ICE, Fingerprint, 'fingerprints');
    JXT.extend(ICE, SctpMap, 'sctp');

    JXT.withDefinition('content', NS.JINGLE_1, function(Content) {
        JXT.extend(Content, ICE);
    });
}
