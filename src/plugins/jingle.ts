import { Agent } from '../';
import * as Jingle from '../jingle';
import {
    NS_JINGLE_1,
    NS_JINGLE_DTLS_0,
    NS_JINGLE_DTLS_SCTP_1,
    NS_JINGLE_FILE_TRANSFER_4,
    NS_JINGLE_FILE_TRANSFER_5,
    NS_JINGLE_GROUPING_0,
    NS_JINGLE_ICE_0,
    NS_JINGLE_ICE_UDP_1,
    NS_JINGLE_RTP_1,
    NS_JINGLE_RTP_AUDIO,
    NS_JINGLE_RTP_HDREXT_0,
    NS_JINGLE_RTP_RTCP_FB_0,
    NS_JINGLE_RTP_SSMA_0,
    NS_JINGLE_RTP_VIDEO
} from '../Namespaces';
import {
    ExternalServiceCredentials,
    ExternalServiceList,
    IQ,
    Jingle as JingleRequest,
    Presence
} from '../protocol';

let root: any;
try {
    root = window;
} catch (err) {
    root = global;
}

declare module '../' {
    export interface Agent {
        jingle: Jingle.SessionManager;

        discoverICEServers(): Promise<RTCIceServer[]>;
        getServices(jid: string, type?: string): Promise<ExternalServiceList>;
        getServiceCredentials(
            jid: string,
            host: string,
            type?: string,
            port?: number
        ): Promise<ExternalServiceCredentials>;
    }

    export interface AgentEvents {
        'iq:set:jingle': IQ & { jingle: JingleRequest };
        'jingle:created': Jingle.Session;
        'jingle:outgoing': Jingle.Session;
        'jingle:incoming': Jingle.Session;
        'jingle:terminated': (session: Jingle.Session, reason?: JingleRequest['reason']) => void;
        'jingle:mute': (session: Jingle.Session, info: JingleRequest['info']) => void;
        'jingle:unmute': (session: Jingle.Session, info: JingleRequest['info']) => void;
        'jingle:hold': (session: Jingle.Session, info?: JingleRequest['info']) => void;
        'jingle:resumed': (session: Jingle.Session, info?: JingleRequest['info']) => void;
        'jingle:ringing': (session: Jingle.Session, info?: JingleRequest['info']) => void;
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
            NS_JINGLE_DTLS_0,
            NS_JINGLE_ICE_0,
            NS_JINGLE_ICE_UDP_1,
            NS_JINGLE_RTP_AUDIO,
            NS_JINGLE_RTP_VIDEO,
            NS_JINGLE_FILE_TRANSFER_4,
            NS_JINGLE_FILE_TRANSFER_5,
            NS_JINGLE_DTLS_SCTP_1,
            'urn:ietf:rfc:3264', // ICE prefer batched candidates
            'urn:ietf:rfc:5576', // Jingle Source Specific Media Attributes
            'urn:ietf:rfc:5888' // Jingle Grouping Framework
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
        jingle.on(event, (session: Jingle.Session, data) => {
            client.emit(('jingle:' + event) as any, session, data);
        });
    }

    jingle.on('createdSession', data => {
        client.emit('jingle:created', data);
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

    client.on('session:bound', (jid: string) => {
        jingle.selfID = jid;
    });

    client.on('iq:set:jingle', (data: IQ & { jingle: JingleRequest }) => {
        jingle.process(data);
    });

    client.on('unavailable', (pres: Presence) => {
        jingle.endPeerSessions(pres.from!, undefined, true);
    });

    client.getServices = async (jid: string, type?: string) => {
        const resp = await client.sendIQ({
            externalServices: {
                type
            } as ExternalServiceList,
            to: jid,
            type: 'get'
        });

        const services = resp.externalServices;
        services.services = services.services || [];

        return services;
    };

    client.getServiceCredentials = async (
        jid: string,
        host: string,
        type?: string,
        port?: number
    ) => {
        const resp = await client.sendIQ({
            externalServiceCredentials: {
                host,
                port,
                type
            } as ExternalServiceCredentials,
            to: jid,
            type: 'get'
        });

        return resp.externalServiceCredentials;
    };

    client.discoverICEServers = async (): Promise<RTCIceServer[]> => {
        try {
            const resp = await client.getServices(client.config.server!);
            const services = resp.services || [];
            const discovered: RTCIceServer[] = [];

            for (const service of services) {
                const ice: RTCIceServer = {
                    urls: []
                };

                const baseUrl = `${service.type}:${service.host}`;
                const port = service.port ? `:${service.port}` : '';
                const transport = service.transport ? `?transport=${service.transport}` : '';

                if (service.type === 'stun' || service.type === 'stuns') {
                    ice.urls = [`${baseUrl}${port}`];
                }
                if (service.type === 'turn' || service.type === 'turns') {
                    if (service.username) {
                        ice.username = service.username;
                    }
                    if (service.password) {
                        ice.credential = service.password;
                    }
                    ice.urls = [`${baseUrl}${port}${transport}`];
                }

                if (ice.urls.length) {
                    discovered.push(ice);
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
