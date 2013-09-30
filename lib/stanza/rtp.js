var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var jingle = require('./jingle');


var NS = 'urn:xmpp:jingle:apps:rtp:1';


exports.RTP = stanza.define({
    name: 'rtp',
    namespace: NS,
    element: 'description',
    fields: {
        media: stanza.attribute('media'),
        ssrc: stanza.attribute('ssrc'),
        bandwidth: stanza.subText(NS, 'bandwidth'),
        bandwidthType: stanza.subAttribute(NS, 'bandwidth', 'type'),
        encryptionRequired: util.boolSubAttribute(NS, 'encryption', 'required'),
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
        parameters: {
            get: function () {
                var result = {};
                var params = stanza.find(this.xml, NS, 'parameter');
                _.forEach(params, function (param) {
                    var key = stanza.getAttribute(param, 'name');
                    var value = stanza.getAttribute(param, 'value');
                    result[key] = value;
                });
                return result;
            },
            set: function (value) {
                var self = this;
                _.forEach(value, function (key, value) {
                    var param = stanza.createElement(NS, 'parameter');
                    param.setAttribute('name', key);
                    param.setAttribute('value', value);
                    self.xml.appendChild(param);
                });
            }
        }
    }
});


exports.Encyrption = stanza.define({
    name: 'encryption',
    namespace: NS,
    element: 'encryption',
    fields: {
        required: util.boolAttribute('required')
    }
});


exports.Crypto = stanza.define({
    name: 'crypto',
    namespace: NS,
    element: 'crypto',
    fields: {
        cipherSuite: stanza.attribute('cipher-suite'),
        keyParams: stanza.attribute('key-params'),
        sessionParams: stanza.attribute('session-params'),
        tag: stanza.attribute('tag')
    }
});


stanza.extend(jingle.Content, exports.RTP);
stanza.extend(exports.RTP, exports.PayloadType, 'payloadTypes');
stanza.extend(exports.RTP, exports.Encryption);
stanza.extend(exports.Encryption, exports.Crypto, 'options');
