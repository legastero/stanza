var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var jingle = require('./jingle');


var NS = 'urn:xmpp:jingle:transports:ice-udp:1';


exports.ICEUDP = stanza.define({
    name: 'iceUdp',
    namespace: NS,
    element: 'transport',
    fields: {
        pwd: stanza.attribute('pwd'),
        ufrag: stanza.attribute('ufrag')
    }
});


exports.RemoteCandidate = stanza.define({
    name: 'iceUdpRemoteCandidate',
    namespace: NS,
    element: 'remote-candidate',
    fields: {
        component: stanza.attribute('component'),
        ip: stanza.attribute('ip'),
        port: stanza.attribute('port')
    }
});


exports.Candidate = stanza.define({
    name: 'iceUdpCandidate',
    namespace: NS,
    element: 'candidate',
    fields: {
        component: stanza.attribute('component'),
        foundation: stanza.attribute('foundation'),
        generation: stanza.attribute('generation'),
        id: stanza.attribute('id'),
        ip: stanza.attribute('ip'),
        network: stanza.attribute('network'),
        port: stanza.attribute('port'),
        priority: stanza.attribute('priority'),
        protocol: stanza.attribute('protocol'),
        relAddr: stanza.attribute('rel-addr'),
        relPort: stanza.attribute('rel-port'),
        type: stanza.attribute('type')
    }
});


exports.Fingerprint = stanza.define({
    name: 'fingerprint',
    namespace: 'urn:xmpp:tmp:jingle:apps:dtls:0',
    element: 'fingerpring',
    fields: {
        hash: stanza.attribute('hash'),
        required: util.boolAttribute('required')
    }
});


stanza.extend(jingle.Content, exports.ICEUDP);
stanza.extend(exports.ICEUDP, exports.Candidate, 'candidates');
stanza.extend(exports.ICEUDP, exports.RemoteCandidate, 'remoteCandidates');
stanza.extend(exports.ICEUDP, exports.Fingerprint);
