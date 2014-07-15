'use strict';

var stanza = require('jxt');
var jingle = require('./jingle');

var NS = 'urn:xmpp:jingle:apps:rtp:1';
var FBNS = 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0';
var HDRNS = 'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0';
var INFONS = 'urn:xmpp:jingle:apps:rtp:info:1';
var SSMANS = 'urn:xmpp:jingle:apps:rtp:ssma:0';
var GROUPNS = 'urn:xmpp:jingle:apps:grouping:0';


var Feedback = {
    get: function () {
        var existing = stanza.find(this.xml, FBNS, 'rtcp-fb');
        var result = [];
        existing.forEach(function (xml) {
            result.push({
                type: stanza.getAttribute(xml, 'type'),
                subtype: stanza.getAttribute(xml, 'subtype')
            });
        });
        existing = stanza.find(this.xml, FBNS, 'rtcp-fb-trr-int');
        existing.forEach(function (xml) {
            result.push({
                type: stanza.getAttribute(xml, 'type'),
                value: stanza.getAttribute(xml, 'value')
            });
        });
        return result;
    },
    set: function (values) {
        var self = this;
        var existing = stanza.find(this.xml, FBNS, 'rtcp-fb');
        existing.forEach(function (item) {
            self.xml.removeChild(item);
        });
        existing = stanza.find(this.xml, FBNS, 'rtcp-fb-trr-int');
        existing.forEach(function (item) {
            self.xml.removeChild(item);
        });

        values.forEach(function (value) {
            var fb;
            if (value.type === 'trr-int') {
                fb = stanza.createElement(FBNS, 'rtcp-fb-trr-int', NS);
                stanza.setAttribute(fb, 'type', value.type);
                stanza.setAttribute(fb, 'value', value.value);
            } else {
                fb = stanza.createElement(FBNS, 'rtcp-fb', NS);
                stanza.setAttribute(fb, 'type', value.type);
                stanza.setAttribute(fb, 'subtype', value.subtype);
            }
            self.xml.appendChild(fb);
        });
    }
};


exports.RTP = stanza.define({
    name: '_rtp',
    namespace: NS,
    element: 'description',
    fields: {
        descType: {value: 'rtp'},
        media: stanza.attribute('media'),
        ssrc: stanza.attribute('ssrc'),
        bandwidth: stanza.subText(NS, 'bandwidth'),
        bandwidthType: stanza.subAttribute(NS, 'bandwidth', 'type'),
        mux: stanza.boolSub(NS, 'rtcp-mux'),
        encryption: {
            get: function () {
                var enc = stanza.find(this.xml, NS, 'encryption');
                if (!enc.length) {
                    return [];
                }
                enc = enc[0];

                var self = this;
                var data = stanza.find(enc, NS, 'crypto');
                var results = [];

                data.forEach(function (xml) {
                    results.push(new exports.Crypto({}, xml, self).toJSON());
                });
                return results;
            },
            set: function (values) {
                var enc = stanza.find(this.xml, NS, 'encryption');
                if (enc.length) {
                    this.xml.removeChild(enc);
                }

                if (!values.length) {
                    return;
                }

                stanza.setBoolSubAttribute(this.xml, NS, 'encryption', 'required', true);
                enc = stanza.find(this.xml, NS, 'encryption')[0];

                var self = this;
                values.forEach(function (value) {
                    var content = new exports.Crypto(value, null, self);
                    enc.appendChild(content.xml);
                });
            }
        },
        feedback: Feedback,
        headerExtensions: {
            get: function () {
                var existing = stanza.find(this.xml, HDRNS, 'rtp-hdrext');
                var result = [];
                existing.forEach(function (xml) {
                    result.push({
                        id: stanza.getAttribute(xml, 'id'),
                        uri: stanza.getAttribute(xml, 'uri'),
                        senders: stanza.getAttribute(xml, 'senders')
                    });
                });
                return result;
            },
            set: function (values) {
                var self = this;
                var existing = stanza.find(this.xml, HDRNS, 'rtp-hdrext');
                existing.forEach(function (item) {
                    self.xml.removeChild(item);
                });

                values.forEach(function (value) {
                    var hdr = stanza.createElement(HDRNS, 'rtp-hdrext', NS);
                    stanza.setAttribute(hdr, 'id', value.id);
                    stanza.setAttribute(hdr, 'uri', value.uri);
                    stanza.setAttribute(hdr, 'senders', value.senders);
                    self.xml.appendChild(hdr);
                });
            }
        }
    }
});


exports.PayloadType = stanza.define({
    name: '_payloadType',
    namespace: NS,
    element: 'payload-type',
    fields: {
        channels: stanza.attribute('channels'),
        clockrate: stanza.attribute('clockrate'),
        id: stanza.attribute('id'),
        maxptime: stanza.attribute('maxptime'),
        name: stanza.attribute('name'),
        ptime: stanza.attribute('ptime'),
        feedback: Feedback,
        parameters: {
            get: function () {
                var result = [];
                var params = stanza.find(this.xml, NS, 'parameter');
                params.forEach(function (param) {
                    result.push({
                        key: stanza.getAttribute(param, 'name'),
                        value: stanza.getAttribute(param, 'value')
                    });
                });
                return result;
            },
            set: function (values) {
                var self = this;
                values.forEach(function (value) {
                    var param = stanza.createElement(NS, 'parameter');
                    stanza.setAttribute(param, 'name', value.key);
                    stanza.setAttribute(param, 'value', value.value);
                    self.xml.appendChild(param);
                });
            }
        }
    }
});


exports.Crypto = stanza.define({
    name: 'crypto',
    namespace: NS,
    element: 'crypto',
    fields: {
        cipherSuite: stanza.attribute('crypto-suite'),
        keyParams: stanza.attribute('key-params'),
        sessionParams: stanza.attribute('session-params'),
        tag: stanza.attribute('tag')
    }
});


exports.ContentGroup = stanza.define({
    name: '_group',
    namespace: GROUPNS,
    element: 'group',
    fields: {
        semantics: stanza.attribute('semantics'),
        contents: stanza.multiSubAttribute(GROUPNS, 'content', 'name')
    }
});

exports.SourceGroup = stanza.define({
    name: '_sourceGroup',
    namespace: SSMANS,
    element: 'ssrc-group',
    fields: {
        semantics: stanza.attribute('semantics'),
        sources: stanza.multiSubAttribute(SSMANS, 'source', 'ssrc')
    }
});

exports.Source = stanza.define({
    name: '_source',
    namespace: SSMANS,
    element: 'source',
    fields: {
        ssrc: stanza.attribute('ssrc'),
        parameters: {
            get: function () {
                var result = [];
                var params = stanza.find(this.xml, SSMANS, 'parameter');
                params.forEach(function (param) {
                    result.push({
                        key: stanza.getAttribute(param, 'name'),
                        value: stanza.getAttribute(param, 'value')
                    });
                });
                return result;
            },
            set: function (values) {
                var self = this;
                values.forEach(function (value) {
                    var param = stanza.createElement(SSMANS, 'parameter');
                    stanza.setAttribute(param, 'name', value.key);
                    stanza.setAttribute(param, 'value', value.value);
                    self.xml.appendChild(param);
                });
            }
        }
    }
});


exports.Mute = stanza.define({
    name: 'mute',
    namespace: INFONS,
    element: 'mute',
    fields: {
        creator: stanza.attribute('creator'),
        name: stanza.attribute('name')
    }
});


exports.Unmute = stanza.define({
    name: 'unmute',
    namespace: INFONS,
    element: 'unmute',
    fields: {
        creator: stanza.attribute('creator'),
        name: stanza.attribute('name')
    }
});


jingle.registerDescription(exports.RTP);

stanza.extend(jingle.Content, exports.RTP);
stanza.extend(exports.RTP, exports.PayloadType, 'payloads');
stanza.extend(exports.RTP, exports.Source, 'sources');
stanza.extend(exports.RTP, exports.SourceGroup, 'sourceGroups');

stanza.extend(jingle.Jingle, exports.Mute);
stanza.extend(jingle.Jingle, exports.Unmute);
stanza.extend(jingle.Jingle, exports.ContentGroup, 'groups');
stanza.add(jingle.Jingle, 'ringing', stanza.boolSub(INFONS, 'ringing'));
stanza.add(jingle.Jingle, 'hold', stanza.boolSub(INFONS, 'hold'));
stanza.add(jingle.Jingle, 'active', stanza.boolSub(INFONS, 'active'));
