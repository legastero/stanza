import * as Jingle from '../jingle';
import { Namespaces } from '../protocol';

let root;
if (typeof window !== 'undefined') {
    root = window;
}
if (typeof global !== 'undefined') {
    root = global;
}

export default function(client) {
    const jingle = (client.jingle = new Jingle.SessionManager());
    client.supportedICEServiceTypes = {
        stun: true,
        stuns: true,
        turn: true,
        turns: true
    };

    client.disco.addFeature(Namespaces.JINGLE_1);
    if (root && root.RTCPeerConnection) {
        const caps = [
            Namespaces.JINGLE_RTP_1,
            Namespaces.JINGLE_RTP_RTCP_FB_0,
            Namespaces.JINGLE_RTP_HDREXT_0,
            Namespaces.JINGLE_RTP_SSMA_0,
            Namespaces.JINGLE_DTLS_0,
            Namespaces.JINGLE_GROUPING_0,
            Namespaces.FILE_TRANSFER_3,
            Namespaces.JINGLE_ICE_UDP_1,
            Namespaces.JINGLE_RTP_AUDIO,
            Namespaces.JINGLE_RTP_VIDEO,
            'urn:xmpp:jingle:transports:dtls-sctp:1',
            'urn:ietf:rfc:3264',
            'urn:ietf:rfc:5576',
            'urn:ietf:rfc:5888'
        ];
        for (const cap of caps) {
            client.disco.addFeature(cap);
        }
    }

    const mappedEvents = [
        'outgoing',
        'incoming',
        'accepted',
        'terminated',
        'ringing',
        'mute',
        'unmute',
        'hold',
        'resumed'
    ];
    for (const event of mappedEvents) {
        jingle.on(event, function(session, arg1) {
            client.emit('jingle:' + event, session, arg1);
        });
    }

    jingle.on('createdSession', function(session) {
        client.emit('jingle:created', session);
    });

    jingle.on('send', function(data) {
        client.sendIq(data, function(err, result) {
            if (err) {
                client.emit('jingle:error', err);
            }
            const resp = err || result;
            if (!resp.jingle) {
                resp.jingle = {};
            }
            resp.jingle.sid = data.jingle.sid;
            jingle.process(resp);
        });
    });

    client.on('session:bound', 'jingle', function(jid) {
        jingle.selfID = jid.full;
    });

    client.on('iq:set:jingle', 'jingle', function(data) {
        jingle.process(data);
    });

    client.on('unavailable', 'jingle', function(pres) {
        const peer = pres.from.full;
        jingle.endPeerSessions(peer, true);
    });

    client.discoverICEServers = function(cb) {
        return this.getServices(client.config.server)
            .then(function(res) {
                const services = res.services.services;
                const discovered = [];

                for (let i = 0; i < services.length; i++) {
                    const service = services[i];
                    const ice = {};

                    if (!client.supportedICEServiceTypes[service.type]) {
                        continue;
                    }

                    if (service.type === 'stun' || service.type === 'stuns') {
                        ice.urls = service.type + ':' + service.host;
                        if (service.port) {
                            ice.urls += ':' + service.port;
                        }
                        discovered.push(ice);
                        client.jingle.addICEServer(ice);
                    } else if (service.type === 'turn' || service.type === 'turns') {
                        ice.urls = service.type + ':' + service.host;
                        if (service.port) {
                            ice.urls += ':' + service.port;
                        }
                        if (service.transport && service.transport !== 'udp') {
                            ice.urls += '?transport=' + service.transport;
                        }

                        if (service.username) {
                            ice.username = service.username;
                        }
                        if (service.password) {
                            ice.credential = service.password;
                        }
                        discovered.push(ice);
                        client.jingle.addICEServer(ice);
                    }
                }

                return discovered;
            })
            .then(
                function(result) {
                    if (cb) {
                        cb(null, result);
                    }
                    return result;
                },
                function(err) {
                    if (cb) {
                        cb(err);
                    } else {
                        throw err;
                    }
                }
            );
    };
}
