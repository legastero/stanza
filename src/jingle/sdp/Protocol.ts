import * as SDP from 'sdp';

import { directionToSenders, JingleSessionRole, sendersToDirection } from '../../Constants';
import { NS_JINGLE_RTP_1 } from '../../Namespaces';
import {
    Jingle,
    JingleContent,
    JingleContentGroup,
    JingleIce,
    JingleIceCandidate,
    JingleRtpCodec,
    JingleRtpDescription,
    JingleRtpHeaderExtension
} from '../../protocol';

import {
    IntermediateCandidate,
    IntermediateMediaDescription,
    IntermediateSessionDescription
} from './Intermediate';

export function convertIntermediateToApplication(
    media: IntermediateMediaDescription,
    role: JingleSessionRole
): JingleRtpDescription {
    const rtp = media.rtpParameters!;
    const rtcp = media.rtcpParameters || {};
    const encodingParameters = media.rtpEncodingParameters || [];

    let hasSSRC = false;
    if (encodingParameters && encodingParameters.length) {
        hasSSRC = !!encodingParameters[0].ssrc; // !== false ???
    }

    const application: JingleRtpDescription = {
        applicationType: NS_JINGLE_RTP_1,
        codecs: [],
        headerExtensions: [],
        media: media.kind as 'audio' | 'video',
        rtcpMux: rtcp.mux,
        rtcpReducedSize: rtcp.reducedSize,
        sourceGroups: [],
        sources: [],
        ssrc: hasSSRC ? encodingParameters[0].ssrc.toString() : undefined,
        streams: []
    };

    for (const ext of rtp.headerExtensions || []) {
        const header: JingleRtpHeaderExtension = {
            id: ext.id,
            uri: ext.uri
        };
        if (ext.direction && ext.direction !== 'sendrecv') {
            header.senders = directionToSenders(role, ext.direction);
        }
        application.headerExtensions!.push(header);
    }

    if (rtcp.ssrc && rtcp.cname) {
        application.sources = [
            {
                parameters: {
                    cname: rtcp.cname
                },
                ssrc: rtcp.ssrc.toString()
            }
        ];
    }

    if (hasSSRC && encodingParameters[0] && encodingParameters[0].rtx) {
        application.sourceGroups = [
            {
                semantics: 'FID',
                sources: [
                    encodingParameters[0].ssrc.toString(),
                    encodingParameters[0].rtx.ssrc.toString()
                ]
            }
        ];
    }

    for (const stream of media.streams || []) {
        application.streams!.push({
            id: stream.stream,
            track: stream.track
        });
    }

    for (const codec of rtp.codecs || []) {
        const payload: JingleRtpCodec = {
            channels: codec.channels,
            clockRate: codec.clockRate,
            id: codec.payloadType.toString(),
            name: codec.name,
            parameters: codec.parameters,
            rtcpFeedback: codec.rtcpFeedback
        };
        if (codec.maxptime) {
            payload.maxptime = codec.maxptime;
        }
        if (codec.parameters && codec.parameters.ptime) {
            payload.ptime = parseInt(codec.parameters.ptime, 10);
        }

        application.codecs!.push(payload);
    }

    return application;
}

export function convertIntermediateToCandidate(
    candidate: IntermediateCandidate
): JingleIceCandidate {
    let component: number;
    if (candidate.component === 'rtp') {
        component = 1;
    } else if (candidate.component === 'rtcp') {
        component = 2;
    } else {
        component = candidate.component;
    }
    return {
        component,
        foundation: candidate.foundation,
        generation: undefined,
        id: undefined,
        ip: candidate.ip,
        network: undefined,
        port: candidate.port,
        priority: candidate.priority,
        protocol: candidate.protocol,
        relatedAddress: candidate.relatedAddress,
        relatedPort: candidate.relatedPort,
        tcpType: candidate.tcpType as 'active' | 'passive' | 'so',
        type: candidate.type
    };
}

export function convertCandidateToIntermediate(
    candidate: JingleIceCandidate
): IntermediateCandidate {
    return {
        address: candidate.ip,
        component:
            candidate.component === 1
                ? 'rtp'
                : candidate.component === 2
                ? 'rtcp'
                : candidate.component,
        foundation: candidate.foundation,
        ip: candidate.ip,
        port: candidate.port,
        priority: candidate.priority,
        protocol: candidate.protocol!,
        relatedAddress: candidate.relatedAddress,
        relatedPort: candidate.relatedPort,
        tcpType: candidate.tcpType as 'active' | 'passive' | 'so',
        type: candidate.type
    };
}

export function convertIntermediateToTransport(
    media: IntermediateMediaDescription,
    transportType: JingleIce['transportType']
): JingleIce {
    const ice = media.iceParameters;
    const dtls = media.dtlsParameters;

    const transport: JingleIce = {
        candidates: [],
        transportType
    };

    if (ice) {
        transport.usernameFragment = ice.usernameFragment;
        transport.password = ice.password;
        if (ice.iceLite) {
            transport.iceLite = true;
        }
    }

    if (dtls) {
        transport.fingerprints = dtls.fingerprints.map(fingerprint => ({
            algorithm: fingerprint.algorithm,
            setup: media.setup!,
            value: fingerprint.value
        }));
    }

    if (media.sctp) {
        transport.sctp = media.sctp;
    }

    for (const candidate of media.candidates || []) {
        transport.candidates!.push(convertIntermediateToCandidate(candidate));
    }

    return transport;
}

export function convertIntermediateToRequest(
    session: IntermediateSessionDescription,
    role: JingleSessionRole,
    transportType: JingleIce['transportType']
): Partial<Jingle> {
    return {
        contents: session.media.map<JingleContent>(media => {
            const isRTP = media.kind === 'audio' || media.kind === 'video';
            return {
                application: isRTP
                    ? convertIntermediateToApplication(media, role)
                    : {
                          applicationType: 'datachannel',
                          protocol: media.protocol
                      },
                creator: JingleSessionRole.Initiator,
                name: media.mid,
                senders: directionToSenders(role, media.direction),
                transport: convertIntermediateToTransport(media, transportType)
            };
        }),
        groups: session.groups
            ? session.groups.map<JingleContentGroup>(group => ({
                  contents: group.mids,
                  semantics: group.semantics
              }))
            : []
    };
}

export function convertContentToIntermediate(
    content: JingleContent,
    role: JingleSessionRole
): IntermediateMediaDescription {
    const application = (content.application! as JingleRtpDescription) || {};
    const transport = content.transport as JingleIce;

    const isRTP = application && application.applicationType === NS_JINGLE_RTP_1;

    const media: IntermediateMediaDescription = {
        direction: sendersToDirection(role, content.senders),
        kind: application.media || 'application',
        mid: content.name,
        protocol: isRTP ? 'UDP/TLS/RTP/SAVPF' : 'UDP/DTLS/SCTP'
    };

    if (isRTP) {
        media.rtcpParameters = {
            compound: !application.rtcpReducedSize,
            mux: application.rtcpMux,
            reducedSize: application.rtcpReducedSize
        };

        if (application.sources && application.sources.length) {
            const source = application.sources[0];
            media.rtcpParameters.ssrc = parseInt(source.ssrc, 10);
            if (source.parameters) {
                media.rtcpParameters.cname = source.parameters.cname;
            }
        }

        media.rtpParameters = {
            codecs: [],
            fecMechanisms: [],
            headerExtensions: [],
            rtcp: []
        };

        if (application.streams) {
            media.streams = [];
            for (const stream of application.streams) {
                media.streams.push({
                    stream: stream.id,
                    track: stream.track!
                });
            }
        }

        if (application.ssrc) {
            media.rtpEncodingParameters = [
                {
                    ssrc: parseInt(application.ssrc, 10)
                }
            ];

            if (application.sourceGroups && application.sourceGroups.length) {
                const group = application.sourceGroups[0];
                media.rtpEncodingParameters[0].rtx = {
                    // TODO: actually look for a FID one with matching ssrc
                    ssrc: parseInt(group.sources[1], 10)
                };
            }
        }

        let hasRED = false;
        let hasULPFEC = false;
        for (const payload of application.codecs || []) {
            const parameters: SDP.SDPCodecAdditionalParameters = payload.parameters || {};

            const rtcpFeedback: SDP.SDPFeedbackParameter[] = [];
            for (const fb of payload.rtcpFeedback || []) {
                rtcpFeedback.push({
                    parameter: fb.parameter!,
                    type: fb.type
                });
            }

            if (payload.name === 'red' || payload.name === 'ulpfec') {
                hasRED = hasRED || payload.name === 'red';
                hasULPFEC = hasULPFEC || payload.name === 'ulpfec';

                const fec = payload.name.toUpperCase();
                if (!media.rtpParameters.fecMechanisms.includes(fec)) {
                    media.rtpParameters.fecMechanisms.push(fec);
                }
            }

            media.rtpParameters.codecs.push({
                channels: payload.channels!,
                clockRate: payload.clockRate!,
                name: payload.name,
                numChannels: payload.channels!,
                parameters,
                payloadType: parseInt(payload.id, 10),
                rtcpFeedback
            });
        }

        for (const ext of application.headerExtensions || []) {
            media.rtpParameters.headerExtensions.push({
                direction: sendersToDirection(role, ext.senders || 'both'),
                id: ext.id,
                uri: ext.uri,
                atrributes: undefined
            });
        }
    }

    if (transport) {
        if (transport.usernameFragment && transport.password) {
            media.iceParameters = {
                password: transport.password,
                usernameFragment: transport.usernameFragment
            };
            if (transport.iceLite) {
                media.iceParameters.iceLite = true;
            }
        }
        if (transport.fingerprints && transport.fingerprints.length) {
            media.dtlsParameters = {
                fingerprints: [],
                role: 'auto'
            };

            for (const fingerprint of transport.fingerprints) {
                media.dtlsParameters.fingerprints.push({
                    algorithm: fingerprint.algorithm!,
                    value: fingerprint.value!
                });
            }

            if (transport.sctp) {
                media.sctp = transport.sctp;
            }

            media.setup = transport.fingerprints[0].setup;
        }

        media.candidates = (transport.candidates || []).map(convertCandidateToIntermediate);
    }

    return media;
}

export function convertRequestToIntermediate(
    jingle: Jingle,
    role: JingleSessionRole
): IntermediateSessionDescription {
    const session: IntermediateSessionDescription = {
        groups: [],
        media: []
    };

    for (const group of jingle.groups || []) {
        session.groups.push({
            mids: group.contents,
            semantics: group.semantics
        });
    }

    for (const content of jingle.contents || []) {
        session.media.push(convertContentToIntermediate(content, role));
    }

    return session;
}
