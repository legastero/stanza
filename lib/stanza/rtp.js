var _ = require('lodash');
var stanza = require('./stanza');
var jingle = require('./jingle');


function RTP(data, xml) {
    return stanza.init(this, xml, data);
}
RTP.prototype = {
    constructor: {
        value: RTP
    },
    _name: 'rtp',
    NS: 'urn:xmpp:jingle:apps:rtp:1',
    EL: 'description',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get media() {
        return stanza.getAttribute(this.xml, 'media');
    },
    set media(value) {
        stanza.setAttribute(this.xml, 'media', value);
    },
    get ssrc() {
        return stanza.getAttribute(this.xml, 'ssrc');
    },
    set ssrc(value) {
        stanza.setAttribute(this.xml, 'ssrc', value);
    },
    get bandwidth() {
        return stanza.getSubText(this.xml, this.NS, 'bandwidth');
    },
    set bandwidth(value) {
        stanza.setSubText(this.xml, this.NS, 'bandwidth', value);
    },
    get bandwidthType() {
        return stanza.getSubAttribute(this.xml, this.NS, 'bandwidth', 'type');
    },
    set bandwidthType(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'bandwidth', 'type', value);
    },
    get payloadTypes() {
        var payloadTypes = stanza.find(this.xml, 'urn:xmpp:jingle:apps:rtp:1', 'payload-type');
        var results = [];
        _.forEach(payloadTypes, function (xml) {
            results.push(new PayloadType({}, xml).toJSON());
        });
        return results;
    },
    set payloadTypes(value) {
        var self = this;
        _.forEach(value, function (data) {
            var payloadType = new PayloadType(data);
            self.xml.appendChild(payloadType.xml);
        });
    },
    get cryptoRequired() {
        var req = stanza.getSubAttribute(this.xml, this.NS, 'encryption', 'required');
        return req === 'true' || req === '1';
    },
    set cryptoRequired(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'encryption', 'required', value ? 'true' : 'false');
    },
    get crypto() {
        var encryption = stanza.find(this.xml, this.NS, 'encryption');
        var results = [];
        if (encryption) {
            var encryptionOptions = stanza.find(encryption, this.NS, 'crypto');
            _.forEach(encryptionOptions, function (xml) {
                results.push(new Crypto({}, xml).toJSON());
            });
        }
        return results;
    },
    set crypto(value) {
        var self = this;
        var encryption = stanza.find(this.xml, this.NS, 'encryption');
        if (!encryption) {
            encryption = document.createElementNS(this.NS, 'encryption');
        }
        _.forEach(value, function (data) {
            var crypto = new Crypto(data);
            encryption.appendChild(crypto.xml);
        });
    }
};


function Crypto(data, xml) {
    return stanza.init(this, xml, data);
}
Crypto.prototype = {
    constructor: {
        value: Crypto 
    },
    _name: '_crypto',
    NS: 'urn:xmpp:jingle:apps:rtp:1',
    EL: 'crypto',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get cipherSuite() {
        return stanza.getAttribute(this.xml, 'cipher-suite');
    },
    set cipherSuite(value) {
        stanza.setAttribute(this.xml, 'cipher-suite', value);
    },
    get keyParams() {
        return stanza.getAttribute(this.xml, 'key-params');
    },
    set keyParams(value) {
        stanza.setAttribute(this.xml, 'key-params', value);
    },
    get sessionParams() {
        return stanza.getAttribute(this.xml, 'session-params');
    },
    set sessionParams(value) {
        stanza.setAttribute(this.xml, 'session-params', value);
    },
    get tag() {
        return stanza.getAttribute(this.xml, 'tag');
    },
    set tag(value) {
        stanza.setAttribute(this.xml, 'tag', value);
    }
};


function PayloadType(data, xml) {
    return stanza.init(this, xml, data);
}
PayloadType.prototype = {
    constructor: {
        value: PayloadType
    },
    _name: 'payloadType',
    NS: 'urn:xmpp:jingle:apps:rtp:1',
    EL: 'payload-type',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get channels() {
        return stanza.getAttribute(this.xml, 'channels');
    },
    set channels(value) {
        stanza.setAttribute(this.xml, 'channels', value);
    },
    get clockrate() {
        return stanza.getAttribute(this.xml, 'clockrate');
    },
    set clockrate(value) {
        stanza.setAttribute(this.xml, 'clockrate', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get maxptime() {
        return stanza.getAttribute(this.xml, 'maxptime');
    },
    set maxptime(value) {
        stanza.setAttribute(this.xml, 'maxptime', value);
    },
    get name() {
        return stanza.getAttribute(this.xml, 'name');
    },
    set name(value) {
        stanza.setAttribute(this.xml, 'name', value);
    },
    get ptime() {
        return stanza.getAttribute(this.xml, 'ptime');
    },
    set ptime(value) {
        stanza.setAttribute(this.xml, 'ptime', value);
    },
    get parameters() {
        var result = {};
        var params = stanza.find(this.xml, this.NS, 'parameter');
        _.forEach(params, function (param) {
            var key = stanza.getAttribute(param, 'name');
            var value = stanza.getAttribute(param, 'value');
            result[key] = value;
        });
        return result;
    },
    set parameters(value) {
        var self = this;
        _.forEach(value, function (key, value) {
            var param = document.createElementNS(self.NS, 'parameter');
            param.setAttribute('name', key);
            param.setAttribute('value', value);
            self.xml.appendChild(param);
        });
    }
};


stanza.extend(jingle.Content, RTP);

exports.RTP = RTP;
exports.Crypto = Crypto;
exports.PayloadType = PayloadType;
