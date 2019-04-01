import { Agent } from '../Definitions';
import * as Jingle from '../jingle';
import {
    NS_FILE_TRANSFER_3,
    NS_JINGLE_1,
    NS_JINGLE_DTLS_0,
    NS_JINGLE_GROUPING_0,
    NS_JINGLE_ICE_UDP_1,
    NS_JINGLE_RTP_1,
    NS_JINGLE_RTP_AUDIO,
    NS_JINGLE_RTP_HDREXT_0,
    NS_JINGLE_RTP_RTCP_FB_0,
    NS_JINGLE_RTP_SSMA_0,
    NS_JINGLE_RTP_VIDEO
} from '../protocol';
import { IQ, Jingle as JingleRequest, NS_JINGLE_DTLS_SCTP_1, Presence } from '../protocol/stanzas';

let root: any;
try {
    root = window;
} catch (err) {
    root = global;
}

declare module '../Definitions' {
    export interface Agent {
        jingle: Jingle.SessionManager;

        discoverICEServers(): Promise<RTCIceServer[]>;
    }
}

export default function(client: Agent) {
    const jingle = (client.jingle = new Jingle.SessionManager());

    client.disco.addFeature(NS_JINGLE_1);
    if (root.RTCPeerConnection) {
        const caps = [
            NS_JINGLE_RTP_1,
            NS_JINGLE_RTP_RTCP_FB_0,
            NS_JINGLE_RTP_HDREXT_0,
            NS_JINGLE_RTP_SSMA_0,
            NS_JINGLE_DTLS_0,
            NS_JINGLE_GROUPING_0,
            NS_FILE_TRANSFER_3,
            NS_JINGLE_ICE_UDP_1,
            NS_JINGLE_RTP_AUDIO,
            NS_JINGLE_RTP_VIDEO,
            NS_JINGLE_DTLS_SCTP_1,
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
        jingle.on(event, (session, arg1) => {
            client.emit('jingle:' + event, session, arg1);
        });
    }

    jingle.on('createdSession', (session: Jingle.Session) => {
        client.emit('jingle:created', session);
    });

    jingle.on('send', async (data: any) => {
        try {
            if (data.type === 'set') {
                const resp = await client.sendIQ(data);
                if (!resp.jingle) {
                    resp.jingle = {};
                }
                resp.jingle.sid = data.jingle.sid;
                jingle.process(resp);
            }
            if (data.type === 'result') {
                client.sendIQResult({ type: 'set', id: data.id, from: data.to }, data);
            }
            if (data.type === 'error') {
                client.sendIQError({ type: 'set', id: data.id, from: data.to }, data);
            }
        } catch (err) {
            console.error(err);
            if (!err.jingle) {
                err.jingle = {};
            }
            err.jingle.sid = data.jingle.sid;
            jingle.process(err);
        }
    });

    client.on('session:bound', 'jingle', (jid: string) => {
        jingle.selfID = jid;
    });

    client.on('iq:set:jingle', 'jingle', (data: IQ & { jingle: JingleRequest }) => {
        jingle.process(data);
    });

    client.on('unavailable', 'jingle', (pres: Presence) => {
        jingle.endPeerSessions(pres.from!, undefined, true);
    });

    client.discoverICEServers = async (): Promise<RTCIceServer[]> => {
        try {
            const resp = await client.getServices(client.config.server!);
            const services = resp.externalServices.services || [];
            const discovered: RTCIceServer[] = [];

            for (const service of services) {
                const ice: RTCIceServer = {
                    urls: []
                };
                if (service.type === 'stun' || service.type === 'stuns') {
                    ice.urls = [
                        `${service.type}:${service.host}${service.port ? `:${service.port}` : ''}`
                    ];
                    discovered.push(ice);
                }
                if (service.type === 'turn' || service.type === 'turns') {
                    if (service.username) {
                        ice.username = service.username;
                    }
                    if (service.password) {
                        ice.credential = service.password;
                    }
                    ice.urls = [
                        `${service.type}:${service.host}${service.port ? `:${service.port}` : ''}${
                            service.transport ? `?transport=${service.transport}` : ''
                        }`
                    ];
                }
            }

            for (const ice of discovered) {
                client.jingle.addICEServer(ice);
            }

            return discovered;
        } catch (err) {
            return [];
        }
    };
}
