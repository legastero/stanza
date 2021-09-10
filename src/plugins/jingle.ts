import { Agent } from '../';
import { RTCPeerConnection } from '../platform';
import * as Jingle from '../jingle';
import {
    NS_JINGLE_1,
    NS_JINGLE_DTLS_0,
    NS_JINGLE_DTLS_SCTP_1,
    NS_JINGLE_FILE_TRANSFER_4,
    NS_JINGLE_FILE_TRANSFER_5,
    NS_JINGLE_ICE_0,
    NS_JINGLE_ICE_UDP_1,
    NS_JINGLE_RTP_1,
    NS_JINGLE_RTP_AUDIO,
    NS_JINGLE_RTP_HDREXT_0,
    NS_JINGLE_RTP_RTCP_FB_0,
    NS_JINGLE_RTP_VIDEO
} from '../Namespaces';
import {
    ExternalServiceCredentials,
    ExternalServiceList,
    IQ,
    Jingle as JingleRequest,
    Presence
} from '../protocol';

declare module '../' {
    export interface Agent {
        jingle: Jingle.SessionManager;

        discoverICEServers(opts?: { version?: '2' | '1' }): Promise<RTCIceServer[]>;
        getServices(jid: string, type?: string, version?: '2' | '1'): Promise<ExternalServiceList>;
        getServiceCredentials(
            jid: string,
            host: string,
            type?: string,
            port?: number,
            version?: '2' | '1'
        ): Promise<ExternalServiceCredentials>;
    }

    export interface AgentEvents {
        'iq:set:jingle': IQ & { jingle: JingleRequest };
        'jingle:created': Jingle.Session;
        'jingle:outgoing': Jingle.Session;
        'jingle:incoming': Jingle.Session;
        'jingle:accepted': Jingle.Session;
        'jingle:terminated': (session: Jingle.Session, reason?: JingleRequest['reason']) => void;
        'jingle:mute': (session: Jingle.Session, info: JingleRequest['info']) => void;
        'jingle:unmute': (session: Jingle.Session, info: JingleRequest['info']) => void;
        'jingle:hold': (session: Jingle.Session, info?: JingleRequest['info']) => void;
        'jingle:resumed': (session: Jingle.Session, info?: JingleRequest['info']) => void;
        'jingle:ringing': (session: Jingle.Session, info?: JingleRequest['info']) => void;
    }

    export interface AgentConfig {
        jingle?: JinglePluginConfig;
    }
}

interface JinglePluginConfig {
    advertiseAudio?: boolean;
    advertiseVideo?: boolean;
    advertiseFileTransfer?: boolean;
    hasRTCPeerConnection?: boolean;
    trickleIce: boolean;
    bundlePolicy?: RTCConfiguration['bundlePolicy'];
    iceTransportPolicy?: RTCConfiguration['iceTransportPolicy'];
    rtcpMuxPolicy?: RTCConfiguration['rtcpMuxPolicy'];
    iceServers?: RTCIceServer[];
    sdpSemantics?: 'unified-plan' | 'plan-b';
}

export default function (client: Agent): void {
    const hasNativePeerConnection = !!RTCPeerConnection;
    const defaultConfig: JinglePluginConfig = {
        advertiseAudio: hasNativePeerConnection,
        advertiseFileTransfer: hasNativePeerConnection,
        advertiseVideo: hasNativePeerConnection,
        bundlePolicy: 'balanced',
        hasRTCPeerConnection: hasNativePeerConnection,
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        iceTransportPolicy: 'all',
        rtcpMuxPolicy: 'require',
        trickleIce: true
    };
    const providedConfig = client.config.jingle;
    const config = {
        ...defaultConfig,
        ...providedConfig
    };

    const jingle = (client.jingle = new Jingle.SessionManager(config));

    const caps: string[] = [NS_JINGLE_1];
    if (config.hasRTCPeerConnection) {
        caps.push(
            NS_JINGLE_ICE_0,
            NS_JINGLE_ICE_UDP_1,
            NS_JINGLE_DTLS_SCTP_1,
            NS_JINGLE_DTLS_0,
            'urn:ietf:rfc:5888' // Jingle Grouping Framework
        );
        if (config.trickleIce === false) {
            caps.push('urn:ietf:rfc:3264'); // ICE prefer batched candidates
        }
        if (config.advertiseAudio || config.advertiseVideo) {
            caps.push(
                NS_JINGLE_RTP_1,
                NS_JINGLE_RTP_RTCP_FB_0,
                NS_JINGLE_RTP_HDREXT_0,
                'urn:ietf:rfc:5576' // Jingle Source Specific Media Attributes
            );
        }
        if (config.advertiseAudio) {
            caps.push(NS_JINGLE_RTP_AUDIO);
        }
        if (config.advertiseVideo) {
            caps.push(NS_JINGLE_RTP_VIDEO);
        }
        if (config.advertiseFileTransfer) {
            caps.push(NS_JINGLE_FILE_TRANSFER_4, NS_JINGLE_FILE_TRANSFER_5);
        }
    }
    for (const cap of caps) {
        client.disco.addFeature(cap);
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
        } catch (err: any) {
            if (!err.jingle) {
                err.jingle = data.jingle;
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

    client.getServices = async (jid: string, type?: string, version?: '2' | '1') => {
        const resp = await client.sendIQ({
            externalServices: {
                type,
                version
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
        port?: number,
        version?: '2' | '1'
    ) => {
        const resp = await client.sendIQ({
            externalServiceCredentials: {
                host,
                port,
                type,
                version
            } as ExternalServiceCredentials,
            to: jid,
            type: 'get'
        });

        return resp.externalServiceCredentials;
    };

    client.discoverICEServers = async (
        opts: { version?: '2' | '1' } = {}
    ): Promise<RTCIceServer[]> => {
        try {
            const resp = await client.getServices(client.config.server!, undefined, opts.version);
            const services = resp.services || [];
            const discovered: RTCIceServer[] = [];

            for (const service of services) {
                client.jingle.addICEServer(service);
            }

            return discovered;
        } catch (err) {
            return [];
        }
    };
}
