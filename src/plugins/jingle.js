'use strict';

import Jingle from 'jingle';


const window = window || global;


export default function (client) {

    const jingle = client.jingle = new Jingle();
    client.supportedICEServiceTypes = {
        stun: true,
        stuns: true,
        turn: true,
        turns: true
    };

    client.disco.addFeature('urn:xmpp:jingle:1');
    if (window.RTCPeerConnection) {
        const caps = [
            'urn:xmpp:jingle:apps:rtp:1',
            'urn:xmpp:jingle:apps:rtp:audio',
            'urn:xmpp:jingle:apps:rtp:video',
            'urn:xmpp:jingle:apps:rtp:rtcb-fb:0',
            'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0',
            'urn:xmpp:jingle:apps:rtp:ssma:0',
            'urn:xmpp:jingle:apps:dtls:0',
            'urn:xmpp:jingle:apps:grouping:0',
            'urn:xmpp:jingle:apps:file-transfer:3',
            'urn:xmpp:jingle:transports:ice-udp:1',
            'urn:xmpp:jingle:transports:dtls-sctp:1',
            'urn:ietf:rfc:3264',
            'urn:ietf:rfc:5576',
            'urn:ietf:rfc:5888'
        ];
        caps.forEach(function (cap) {
            client.disco.addFeature(cap);
        });
    }

    const mappedEvents = [
        'outgoing', 'incoming', 'accepted', 'terminated',
        'ringing', 'mute', 'unmute', 'hold', 'resumed'
    ];
    mappedEvents.forEach(function (event) {
        jingle.on(event, function (session, arg1) {
            client.emit('jingle:' + event, session, arg1);
        });
    });

    jingle.on('createdSession', function (session) {
        client.emit('jingle:created', session);
    });

    jingle.on('peerStreamAdded', function (session, stream) {
        client.emit('jingle:remotestream:added', session, stream);
    });

    jingle.on('peerStreamRemoved', function (session, stream) {
        client.emit('jingle:remotestream:removed', session, stream);
    });

    jingle.on('send', function (data) {
        client.sendIq(data, function (err) {
            if (err) {
                client.emit('jingle:error', err);
            }
        });
    });

    client.on('session:bound', 'jingle', function (jid) {
        jingle.jid = jid;
        jingle.selfID = jid.full;
    });

    client.on('iq:set:jingle', 'jingle', function (data) {
        jingle.process(data);
    });

    client.on('unavailable', 'jingle', function (pres) {
        const peer = pres.from.full;
        jingle.endPeerSessions(peer, true);
    });

    client.discoverICEServers = function (cb) {
        return this.getServices(client.config.server).then(function (res) {
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
        }).then(function (result) {
            if (cb) {
                cb(null, result);
            }
            return result;
        }, function (err) {
            if (cb) {
                cb(err);
            } else {
                throw err;
            }
        });
    };
}
