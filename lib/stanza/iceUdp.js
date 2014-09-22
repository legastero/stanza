'use strict';

var NS = 'urn:xmpp:jingle:transports:ice-udp:1';


module.exports = function (stanza) {
    var types = stanza.utils;

    var ICE = stanza.define({
        name: '_iceUdp',
        namespace: NS,
        element: 'transport',
        tags: ['jingle-transport'],
        fields: {
            transType: {value: 'iceUdp'},
            pwd: types.attribute('pwd'),
            ufrag: types.attribute('ufrag')
        }
    });
    
    
    var RemoteCandidate = stanza.define({
        name: 'remoteCandidate',
        namespace: NS,
        element: 'remote-candidate',
        fields: {
            component: types.attribute('component'),
            ip: types.attribute('ip'),
            port: types.attribute('port')
        }
    });
    
    
    var Candidate = stanza.define({
        name: '_iceUdpCandidate',
        namespace: NS,
        element: 'candidate',
        fields: {
            component: types.attribute('component'),
            foundation: types.attribute('foundation'),
            generation: types.attribute('generation'),
            id: types.attribute('id'),
            ip: types.attribute('ip'),
            network: types.attribute('network'),
            port: types.attribute('port'),
            priority: types.attribute('priority'),
            protocol: types.attribute('protocol'),
            relAddr: types.attribute('rel-addr'),
            relPort: types.attribute('rel-port'),
            tcpType: types.attribute('tcptype'),
            type: types.attribute('type')
        }
    });
    
    
    var Fingerprint = stanza.define({
        name: '_iceFingerprint',
        namespace: 'urn:xmpp:jingle:apps:dtls:0',
        element: 'fingerprint',
        fields: {
            hash: types.attribute('hash'),
            setup: types.attribute('setup'),
            value: types.text(),
            required: types.boolAttribute('required')
        }
    });
    
    var SctpMap = stanza.define({
        name: '_sctpMap',
        namespace: 'urn:xmpp:jingle:transports:dtls-sctp:1',
        element: 'sctpmap',
        fields: {
            number: types.attribute('number'),
            protocol: types.attribute('protocol'),
            streams: types.attribute('streams')
        }
    });

    
    stanza.extend(ICE, Candidate, 'candidates');
    stanza.extend(ICE, RemoteCandidate);
    stanza.extend(ICE, Fingerprint, 'fingerprints');
    stanza.extend(ICE, SctpMap, 'sctp');

    stanza.withDefinition('content', 'urn:xmpp:jingle:1', function (Content) {
        stanza.extend(Content, ICE);
    });
};
