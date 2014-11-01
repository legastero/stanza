'use strict';

var NS = 'urn:xmpp:jingle:apps:rtp:1';
var FBNS = 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0';
var HDRNS = 'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0';
var INFONS = 'urn:xmpp:jingle:apps:rtp:info:1';
var SSMANS = 'urn:xmpp:jingle:apps:rtp:ssma:0';
var GROUPNS = 'urn:xmpp:jingle:apps:grouping:0';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Feedback = {
        get: function () {
            var existing = types.find(this.xml, FBNS, 'rtcp-fb');
            var result = [];
            existing.forEach(function (xml) {
                result.push({
                    type: types.getAttribute(xml, 'type'),
                    subtype: types.getAttribute(xml, 'subtype')
                });
            });
            existing = types.find(this.xml, FBNS, 'rtcp-fb-trr-int');
            existing.forEach(function (xml) {
                result.push({
                    type: types.getAttribute(xml, 'type'),
                    value: types.getAttribute(xml, 'value')
                });
            });
            return result;
        },
        set: function (values) {
            var self = this;
            var existing = types.find(this.xml, FBNS, 'rtcp-fb');
            existing.forEach(function (item) {
                self.xml.removeChild(item);
            });
            existing = types.find(this.xml, FBNS, 'rtcp-fb-trr-int');
            existing.forEach(function (item) {
                self.xml.removeChild(item);
            });
    
            values.forEach(function (value) {
                var fb;
                if (value.type === 'trr-int') {
                    fb = types.createElement(FBNS, 'rtcp-fb-trr-int', NS);
                    types.setAttribute(fb, 'type', value.type);
                    types.setAttribute(fb, 'value', value.value);
                } else {
                    fb = types.createElement(FBNS, 'rtcp-fb', NS);
                    types.setAttribute(fb, 'type', value.type);
                    types.setAttribute(fb, 'subtype', value.subtype);
                }
                self.xml.appendChild(fb);
            });
        }
    };
    
    var Bandwidth = stanza.define({
        name: 'bandwidth',
        namespace: NS,
        element: 'bandwidth',
        fields: {
            type: types.attribute('type'),
            bandwidth: types.text()
        }
    });

    var RTP = stanza.define({
        name: '_rtp',
        namespace: NS,
        element: 'description',
        tags: ['jingle-description'],
        fields: {
            descType: {value: 'rtp'},
            media: types.attribute('media'),
            ssrc: types.attribute('ssrc'),
            mux: types.boolSub(NS, 'rtcp-mux'),
            encryption: {
                get: function () {
                    var enc = types.find(this.xml, NS, 'encryption');
                    if (!enc.length) {
                        return [];
                    }
                    enc = enc[0];
    
                    var self = this;
                    var data = types.find(enc, NS, 'crypto');
                    var results = [];
    
                    data.forEach(function (xml) {
                        results.push(new Crypto({}, xml, self).toJSON());
                    });
                    return results;
                },
                set: function (values) {
                    var enc = types.find(this.xml, NS, 'encryption');
                    if (enc.length) {
                        this.xml.removeChild(enc);
                    }
    
                    if (!values.length) {
                        return;
                    }
    
                    types.setBoolSubAttribute(this.xml, NS, 'encryption', 'required', true);
                    enc = types.find(this.xml, NS, 'encryption')[0];
    
                    var self = this;
                    values.forEach(function (value) {
                        var content = new Crypto(value, null, self);
                        enc.appendChild(content.xml);
                    });
                }
            },
            feedback: Feedback,
            headerExtensions: {
                get: function () {
                    var existing = types.find(this.xml, HDRNS, 'rtp-hdrext');
                    var result = [];
                    existing.forEach(function (xml) {
                        result.push({
                            id: types.getAttribute(xml, 'id'),
                            uri: types.getAttribute(xml, 'uri'),
                            senders: types.getAttribute(xml, 'senders')
                        });
                    });
                    return result;
                },
                set: function (values) {
                    var self = this;
                    var existing = types.find(this.xml, HDRNS, 'rtp-hdrext');
                    existing.forEach(function (item) {
                        self.xml.removeChild(item);
                    });
    
                    values.forEach(function (value) {
                        var hdr = types.createElement(HDRNS, 'rtp-hdrext', NS);
                        types.setAttribute(hdr, 'id', value.id);
                        types.setAttribute(hdr, 'uri', value.uri);
                        types.setAttribute(hdr, 'senders', value.senders);
                        self.xml.appendChild(hdr);
                    });
                }
            }
        }
    });
    
    
    var PayloadType = stanza.define({
        name: '_payloadType',
        namespace: NS,
        element: 'payload-type',
        fields: {
            channels: types.attribute('channels'),
            clockrate: types.attribute('clockrate'),
            id: types.attribute('id'),
            maxptime: types.attribute('maxptime'),
            name: types.attribute('name'),
            ptime: types.attribute('ptime'),
            feedback: Feedback,
            parameters: {
                get: function () {
                    var result = [];
                    var params = types.find(this.xml, NS, 'parameter');
                    params.forEach(function (param) {
                        result.push({
                            key: types.getAttribute(param, 'name'),
                            value: types.getAttribute(param, 'value')
                        });
                    });
                    return result;
                },
                set: function (values) {
                    var self = this;
                    values.forEach(function (value) {
                        var param = types.createElement(NS, 'parameter');
                        types.setAttribute(param, 'name', value.key);
                        types.setAttribute(param, 'value', value.value);
                        self.xml.appendChild(param);
                    });
                }
            }
        }
    });
    
    
    var Crypto = stanza.define({
        name: 'crypto',
        namespace: NS,
        element: 'crypto',
        fields: {
            cipherSuite: types.attribute('crypto-suite'),
            keyParams: types.attribute('key-params'),
            sessionParams: types.attribute('session-params'),
            tag: types.attribute('tag')
        }
    });
    
    
    var ContentGroup = stanza.define({
        name: '_group',
        namespace: GROUPNS,
        element: 'group',
        fields: {
            semantics: types.attribute('semantics'),
            contents: types.multiSubAttribute(GROUPNS, 'content', 'name')
        }
    });
    
    var SourceGroup = stanza.define({
        name: '_sourceGroup',
        namespace: SSMANS,
        element: 'ssrc-group',
        fields: {
            semantics: types.attribute('semantics'),
            sources: types.multiSubAttribute(SSMANS, 'source', 'ssrc')
        }
    });
    
    var Source = stanza.define({
        name: '_source',
        namespace: SSMANS,
        element: 'source',
        fields: {
            ssrc: types.attribute('ssrc'),
            parameters: {
                get: function () {
                    var result = [];
                    var params = types.find(this.xml, SSMANS, 'parameter');
                    params.forEach(function (param) {
                        result.push({
                            key: types.getAttribute(param, 'name'),
                            value: types.getAttribute(param, 'value')
                        });
                    });
                    return result;
                },
                set: function (values) {
                    var self = this;
                    values.forEach(function (value) {
                        var param = types.createElement(SSMANS, 'parameter');
                        types.setAttribute(param, 'name', value.key);
                        types.setAttribute(param, 'value', value.value);
                        self.xml.appendChild(param);
                    });
                }
            }
        }
    });
    
    
    var Mute = stanza.define({
        name: 'mute',
        namespace: INFONS,
        element: 'mute',
        fields: {
            creator: types.attribute('creator'),
            name: types.attribute('name')
        }
    });
    
    
    var Unmute = stanza.define({
        name: 'unmute',
        namespace: INFONS,
        element: 'unmute',
        fields: {
            creator: types.attribute('creator'),
            name: types.attribute('name')
        }
    });
    
    
    stanza.extend(RTP, Bandwidth);
    stanza.extend(RTP, PayloadType, 'payloads');
    stanza.extend(RTP, Source, 'sources');
    stanza.extend(RTP, SourceGroup, 'sourceGroups');
    
    stanza.withDefinition('content', 'urn:xmpp:jingle:1', function (Content) {
        stanza.extend(Content, RTP);
    });

    stanza.withDefinition('jingle', 'urn:xmpp:jingle:1', function (Jingle) {
        stanza.extend(Jingle, Mute);
        stanza.extend(Jingle, Unmute);
        stanza.extend(Jingle, ContentGroup, 'groups');
        stanza.add(Jingle, 'ringing', types.boolSub(INFONS, 'ringing'));
        stanza.add(Jingle, 'hold', types.boolSub(INFONS, 'hold'));
        stanza.add(Jingle, 'active', types.boolSub(INFONS, 'active'));
    });
};
