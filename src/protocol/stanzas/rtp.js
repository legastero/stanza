import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Feedback = {
        get: function() {
            let existing = Utils.find(this.xml, NS.JINGLE_RTP_RTCP_FB_0, 'rtcp-fb');
            const result = [];
            for (const xml of existing) {
                result.push({
                    subtype: Utils.getAttribute(xml, 'subtype'),
                    type: Utils.getAttribute(xml, 'type')
                });
            }
            existing = Utils.find(this.xml, NS.JINGLE_RTP_RTCP_FB_0, 'rtcp-fb-trr-int');
            for (const xml of existing) {
                result.push({
                    type: Utils.getAttribute(xml, 'type'),
                    value: Utils.getAttribute(xml, 'value')
                });
            }
            return result;
        },
        set: function(values) {
            const self = this;
            let existing = Utils.find(this.xml, NS.JINGLE_RTP_RTCP_FB_0, 'rtcp-fb');
            for (const item of existing) {
                self.xml.removeChild(item);
            }
            existing = Utils.find(this.xml, NS.JINGLE_RTP_RTCP_FB_0, 'rtcp-fb-trr-int');
            for (const item of existing) {
                self.xml.removeChild(item);
            }

            for (const value of values) {
                let fb;
                if (value.type === 'trr-int') {
                    fb = Utils.createElement(
                        NS.JINGLE_RTP_RTCP_FB_0,
                        'rtcp-fb-trr-int',
                        NS.JINGLE_RTP_1
                    );
                    Utils.setAttribute(fb, 'type', value.type);
                    Utils.setAttribute(fb, 'value', value.value);
                } else {
                    fb = Utils.createElement(NS.JINGLE_RTP_RTCP_FB_0, 'rtcp-fb', NS.JINGLE_RTP_1);
                    Utils.setAttribute(fb, 'type', value.type);
                    Utils.setAttribute(fb, 'subtype', value.subtype);
                }
                self.xml.appendChild(fb);
            }
        }
    };

    const Bandwidth = JXT.define({
        element: 'bandwidth',
        fields: {
            bandwidth: Utils.text(),
            type: Utils.attribute('type')
        },
        name: 'bandwidth',
        namespace: NS.JINGLE_RTP_1
    });

    const RTP = JXT.define({
        element: 'description',
        fields: {
            applicationType: {
                value: 'rtp',
                writable: true
            },
            encryption: {
                get: function() {
                    let enc = Utils.find(this.xml, NS.JINGLE_RTP_1, 'encryption');

                    if (!enc.length) {
                        return [];
                    }

                    enc = enc[0];
                    const self = this;
                    const data = Utils.find(enc, NS.JINGLE_RTP_1, 'crypto');
                    const results = [];

                    for (const xml of data) {
                        results.push(new Crypto({}, xml, self).toJSON());
                    }

                    return results;
                },
                set: function(values) {
                    let enc = Utils.find(this.xml, NS.JINGLE_RTP_1, 'encryption');

                    if (enc.length) {
                        this.xml.removeChild(enc);
                    }

                    if (!values.length) {
                        return;
                    }

                    Utils.setBoolSubAttribute(
                        this.xml,
                        NS.JINGLE_RTP_1,
                        'encryption',
                        'required',
                        true
                    );
                    enc = Utils.find(this.xml, NS.JINGLE_RTP_1, 'encryption')[0];
                    const self = this;

                    for (const value of values) {
                        const content = new Crypto(value, null, self);
                        enc.appendChild(content.xml);
                    }
                }
            },
            feedback: Feedback,
            headerExtensions: {
                get: function() {
                    const existing = Utils.find(this.xml, NS.JINGLE_RTP_HDREXT_0, 'rtp-hdrext');
                    const result = [];

                    for (const xml of existing) {
                        result.push({
                            id: Utils.getAttribute(xml, 'id'),
                            senders: Utils.getAttribute(xml, 'senders'),
                            uri: Utils.getAttribute(xml, 'uri')
                        });
                    }

                    return result;
                },
                set: function(values) {
                    const self = this;
                    const existing = Utils.find(this.xml, NS.JINGLE_RTP_HDREXT_0, 'rtp-hdrext');

                    for (const item of existing) {
                        self.xml.removeChild(item);
                    }

                    for (const value of values) {
                        const hdr = Utils.createElement(
                            NS.JINGLE_RTP_HDREXT_0,
                            'rtp-hdrext',
                            NS.JINGLE_RTP_1
                        );
                        Utils.setAttribute(hdr, 'id', value.id);
                        Utils.setAttribute(hdr, 'uri', value.uri);
                        Utils.setAttribute(hdr, 'senders', value.senders);
                        self.xml.appendChild(hdr);
                    }
                }
            },
            media: Utils.attribute('media'),
            mux: Utils.boolSub(NS.JINGLE_RTP_1, 'rtcp-mux'),
            ssrc: Utils.attribute('ssrc')
        },
        name: '_rtp',
        namespace: NS.JINGLE_RTP_1,
        tags: ['jingle-application']
    });

    const PayloadType = JXT.define({
        element: 'payload-type',
        fields: {
            channels: Utils.attribute('channels'),
            clockrate: Utils.attribute('clockrate'),
            feedback: Feedback,
            id: Utils.attribute('id'),
            maxptime: Utils.attribute('maxptime'),
            name: Utils.attribute('name'),
            parameters: {
                get: function() {
                    const result = [];
                    const params = Utils.find(this.xml, NS.JINGLE_RTP_1, 'parameter');
                    for (const param of params) {
                        result.push({
                            key: Utils.getAttribute(param, 'name'),
                            value: Utils.getAttribute(param, 'value')
                        });
                    }
                    return result;
                },
                set: function(values) {
                    const self = this;
                    for (const value of values) {
                        const param = Utils.createElement(NS.JINGLE_RTP_1, 'parameter');
                        Utils.setAttribute(param, 'name', value.key);
                        Utils.setAttribute(param, 'value', value.value);
                        self.xml.appendChild(param);
                    }
                }
            },
            ptime: Utils.attribute('ptime')
        },
        name: '_payloadType',
        namespace: NS.JINGLE_RTP_1
    });

    const Crypto = JXT.define({
        element: 'crypto',
        fields: {
            cipherSuite: Utils.attribute('crypto-suite'),
            keyParams: Utils.attribute('key-params'),
            sessionParams: Utils.attribute('session-params'),
            tag: Utils.attribute('tag')
        },
        name: 'crypto',
        namespace: NS.JINGLE_RTP_1
    });

    const ContentGroup = JXT.define({
        element: 'group',
        fields: {
            contents: Utils.multiSubAttribute(NS.JINGLE_GROUPING_0, 'content', 'name'),
            semantics: Utils.attribute('semantics')
        },
        name: '_group',
        namespace: NS.JINGLE_GROUPING_0
    });

    const SourceGroup = JXT.define({
        element: 'ssrc-group',
        fields: {
            semantics: Utils.attribute('semantics'),
            sources: Utils.multiSubAttribute(NS.JINGLE_RTP_SSMA_0, 'source', 'ssrc')
        },
        name: '_sourceGroup',
        namespace: NS.JINGLE_RTP_SSMA_0
    });

    const Source = JXT.define({
        element: 'source',
        fields: {
            parameters: {
                get: function() {
                    const result = [];
                    const params = Utils.find(this.xml, NS.JINGLE_RTP_SSMA_0, 'parameter');

                    for (const param of params) {
                        result.push({
                            key: Utils.getAttribute(param, 'name'),
                            value: Utils.getAttribute(param, 'value')
                        });
                    }

                    return result;
                },
                set: function(values) {
                    const self = this;

                    for (const value of values) {
                        const param = Utils.createElement(NS.JINGLE_RTP_SSMA_0, 'parameter');
                        Utils.setAttribute(param, 'name', value.key);
                        Utils.setAttribute(param, 'value', value.value);
                        self.xml.appendChild(param);
                    }
                }
            },
            ssrc: Utils.attribute('ssrc')
        },
        name: '_source',
        namespace: NS.JINGLE_RTP_SSMA_0
    });

    const Stream = JXT.define({
        element: 'stream',
        fields: {
            id: Utils.attribute('id'),
            track: Utils.attribute('track')
        },
        name: '_stream',
        namespace: 'urn:xmpp:jingle:apps:rtp:msid:0'
    });

    const Mute = JXT.define({
        element: 'mute',
        fields: {
            creator: Utils.attribute('creator'),
            name: Utils.attribute('name')
        },
        name: 'mute',
        namespace: NS.JINGLE_RTP_INFO_1
    });

    const Unmute = JXT.define({
        element: 'unmute',
        fields: {
            creator: Utils.attribute('creator'),
            name: Utils.attribute('name')
        },
        name: 'unmute',
        namespace: NS.JINGLE_RTP_INFO_1
    });

    JXT.extend(RTP, Bandwidth);
    JXT.extend(RTP, PayloadType, 'payloads');
    JXT.extend(RTP, Source, 'sources');
    JXT.extend(RTP, SourceGroup, 'sourceGroups');
    JXT.extend(RTP, Stream, 'streams');

    JXT.withDefinition('content', NS.JINGLE_1, function(Content) {
        JXT.extend(Content, RTP);
    });

    JXT.withDefinition('jingle', NS.JINGLE_1, function(Jingle) {
        JXT.extend(Jingle, Mute);
        JXT.extend(Jingle, Unmute);
        JXT.extend(Jingle, ContentGroup, 'groups');
        JXT.add(Jingle, 'ringing', Utils.boolSub(NS.JINGLE_RTP_INFO_1, 'ringing'));
        JXT.add(Jingle, 'hold', Utils.boolSub(NS.JINGLE_RTP_INFO_1, 'hold'));
        JXT.add(Jingle, 'active', Utils.boolSub(NS.JINGLE_RTP_INFO_1, 'active'));
    });
}
