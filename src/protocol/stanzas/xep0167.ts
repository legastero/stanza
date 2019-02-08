// ====================================================================
// XEP-0167: Jingle RTP Sessions
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0167.html
// Version: 1.1.1 (2016-07-08)
//
// Additional:
// - rtcpMux flag
// - rtcpReducedSize flag
// - media streams list
//
// --------------------------------------------------------------------
// XEP-0262: Use of ZRTP in Jingle RTP Sessions
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0262.html
// Version: 1.0 (2011-06-15)
//
// --------------------------------------------------------------------
// XEP-0293: Jingle RTP Feedback Negotiation
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0293.html
// Version: 1.0 (2015-08-11)
//
// --------------------------------------------------------------------
// XEP-0294: Jingle RTP Header Extensions Negotiation
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0294.html
// Version: 1.0 (2015-08-11)
//
// --------------------------------------------------------------------
// XEP-0339: Source-Specific Media Attributes in Jingle
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0339.html
// Version: 0.3 (2017-09-11)
// ====================================================================

import {
    attribute,
    booleanAttribute,
    childBoolean,
    createElement,
    DefinitionOptions,
    FieldDefinition,
    findAll,
    integerAttribute,
    multipleChildAttribute,
    textBuffer,
    TranslationContext,
    XMLElement
} from '../../jxt';

import {
    NS_JINGLE_RTP_1,
    NS_JINGLE_RTP_HDREXT_0,
    NS_JINGLE_RTP_MSID_0,
    NS_JINGLE_RTP_RTCP_FB_0,
    NS_JINGLE_RTP_SSMA_0
} from './namespaces';
import { parameterMap } from './util';
import { JingleApplication } from './xep0166';
import { Thumbnail } from './xep0264';
import { JingleDtlsFingerprint } from './xep0320';

declare module './xep0166' {
    export interface JingleReason {
        rtpError: 'invalid-crypto' | 'crypto-required';
    }
}

export interface JingleRtpDescription extends JingleApplication {
    applicationType: typeof NS_JINGLE_RTP_1;
    media: 'audio' | 'video';
    ssrc?: string;
    rtcpMux?: boolean;
    rtcpFeedback?: JingleRtcpFeedback[];
    rtcpRecucedSize?: boolean;
    headerExtensions?: JingleRtpHeaderExtension[];
    codecs?: JingleRtpCodec[];
    sources?: JingleRtpSource[];
    sourceGroups?: JingleRtpSourceGroup[];
    streams?: JingleRtpMediaStream[];
    thumbnails?: Thumbnail[];
    encryption?: JingleRtpEncryption;
}

export interface JingleRtpCodec {
    channels?: number;
    clockRate?: number;
    id: string;
    maxptime?: string;
    name: string;
    ptime?: string;
    parameters?: { [key: string]: string };
    rtcpFeedback?: JingleRtcpFeedback[];
}

export interface JingleRtcpFeedback {
    type: string;
    parameter?: string;
}

export interface JingleRtpSource {
    ssrc: string;
    parameters: { [key: string]: string };
}

export interface JingleRtpMediaStream {
    id: string;
    track?: string;
}

export interface JingleRtpHeaderExtension {
    id: string;
    uri: string;
    senders: string;
}

export interface JingleRtpSourceGroup {
    semantics: string;
    sources: string[];
}

export interface JingleRtpEncryption {
    required?: boolean;
    sdes?: JingleRtpSdes[];
    zrtp?: JingleRtpZrtp;
    dtls?: JingleDtlsFingerprint[];
}

export interface JingleRtpSdes {
    cryptoSuite?: string;
    keyParameterss?: string;
    sessionParameters?: string;
    tag?: number;
}

export interface JingleRtpZrtp {
    version?: string;
    value?: Buffer;
}

function rtcpFeedback(): FieldDefinition {
    return {
        importer(xml: XMLElement, context: TranslationContext): any {
            let existing = findAll(xml, NS_JINGLE_RTP_RTCP_FB_0, 'rtcp-fb');
            const typeImporter = attribute('type').importer;
            const subtypeImporter = attribute('subtype').importer;
            const valueImporter = attribute('value').importer;

            const result: Array<{ type: string; parameter?: string }> = [];
            for (const child of existing) {
                result.push({
                    parameter: subtypeImporter(child, context),
                    type: typeImporter(child, context)!
                });
            }

            existing = findAll(xml, NS_JINGLE_RTP_RTCP_FB_0, 'rtcp-fb-trr-int');
            for (const child of existing) {
                result.push({
                    parameter: valueImporter(child, context),
                    type: typeImporter(child, context)!
                });
            }
            return result;
        },
        exporter(
            xml: XMLElement,
            values: Array<{ type: string; parameter?: string }>,
            context: TranslationContext
        ) {
            const typeExporter = attribute('type').exporter;
            const subtypeExporter = attribute('subtype').exporter;
            const valueExporter = attribute('value').exporter;

            for (const fb of values) {
                let child: XMLElement;
                if (fb.type === 'trr-int') {
                    child = createElement(NS_JINGLE_RTP_RTCP_FB_0, 'rtcp-fb-trr-int');
                    typeExporter(child, fb.type, context);
                    if (fb.parameter) {
                        valueExporter(child, fb.parameter, context);
                    }
                } else {
                    child = createElement(NS_JINGLE_RTP_RTCP_FB_0, 'rtcp-fb');
                    typeExporter(child, fb.type, context);
                    if (fb.parameter) {
                        subtypeExporter(child, fb.parameter, context);
                    }
                }
                xml.appendChild(child);
            }
        }
    };
}

export default [
    {
        aliases: ['iq.jingle.contents.application'],
        element: 'description',
        fields: {
            feedback: rtcpFeedback(),
            media: attribute('media'),
            rtcpMux: childBoolean(null, 'rtcp-mux'),
            rtcpReducedSize: childBoolean(null, 'rtcp-reduced-size'),
            ssrc: attribute('ssrc')
        },
        namespace: NS_JINGLE_RTP_1,
        type: NS_JINGLE_RTP_1
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents.application.headerExtensions',
                selector: NS_JINGLE_RTP_1
            }
        ],
        element: 'rtp-hdrext',
        fields: {
            id: attribute('id'),
            senders: attribute('senders'),
            uri: attribute('uri')
        },
        namespace: NS_JINGLE_RTP_HDREXT_0
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents.application.payloads',
                selector: NS_JINGLE_RTP_1
            },
            'rtpcodec'
        ],
        element: 'payload-type',
        fields: {
            channels: integerAttribute('channels'),
            clockRate: integerAttribute('clockrate'),
            feedback: rtcpFeedback(),
            id: attribute('id'),
            maxptime: integerAttribute('maxptime'),
            name: attribute('name'),
            parameters: parameterMap(NS_JINGLE_RTP_1, 'parameter', 'name', 'value'),
            ptime: integerAttribute('ptime')
        },
        namespace: NS_JINGLE_RTP_1
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents.application.sources',
                selector: NS_JINGLE_RTP_1
            }
        ],
        element: 'source',
        fields: {
            parameters: parameterMap(NS_JINGLE_RTP_SSMA_0, 'parameter', 'name', 'value'),
            ssrc: attribute('ssrc')
        },
        namespace: NS_JINGLE_RTP_SSMA_0
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents.application.sourceGroups',
                selector: NS_JINGLE_RTP_1
            }
        ],
        element: 'ssrc-group',
        fields: {
            semantics: attribute('semantics'),
            sources: multipleChildAttribute(null, 'source', 'ssrc')
        },
        namespace: NS_JINGLE_RTP_SSMA_0
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents.application.streams',
                selector: NS_JINGLE_RTP_1
            }
        ],
        element: 'stream',
        fields: {
            id: attribute('id'),
            track: attribute('track')
        },
        namespace: NS_JINGLE_RTP_MSID_0
    },
    {
        aliases: [{ path: 'iq.jingle.contents.application.encryption', selector: NS_JINGLE_RTP_1 }],
        element: 'encryption',
        fields: {
            required: booleanAttribute('required')
        },
        namespace: NS_JINGLE_RTP_1
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'iq.jingle.contents.application.encryption.sdes',
                selector: NS_JINGLE_RTP_1
            }
        ],
        element: 'crypto',
        fields: {
            cryptoSuite: attribute('crypto-suite'),
            keyParameters: attribute('key-params'),
            sessionParameters: attribute('session-params'),
            tag: integerAttribute('tag')
        },
        namespace: NS_JINGLE_RTP_1
    },
    {
        aliases: [
            {
                path: 'iq.jingle.contents.application.encryption.zrtp',
                selector: NS_JINGLE_RTP_1
            }
        ],
        element: 'zrtp-hash',
        fields: {
            value: textBuffer('hex'),
            version: attribute('version')
        },
        namespace: NS_JINGLE_RTP_1
    }
] as DefinitionOptions[];
