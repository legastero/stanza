'use strict';

var stanza = require('jxt');
var Iq = require('./iq');
var ErrorStanza = require('./error');


var NS = 'urn:xmpp:jingle:1';
var ERRNS = 'urn:xmpp:jingle:errors:1';
var CONDITIONS = ['out-of-order', 'tie-break', 'unknown-session', 'unsupported-info'];
var REASONS = [
    'alternative-session', 'busy', 'cancel', 'connectivity-error',
    'decline', 'expired', 'failed-application', 'failed-transport',
    'general-error', 'gone', 'incompatible-parameters', 'media-error',
    'security-error', 'success', 'timeout', 'unsupported-applications',
    'unsupported-transports'
];


var REGISTRY = {
    descriptions: [],
    transports: []
};


exports.registerDescription = function (desc) {
    REGISTRY.descriptions.push(desc.prototype._name);
};

exports.registerTransport = function (trans) {
    REGISTRY.transports.push(trans.prototype._name);
};


exports.Jingle = stanza.define({
    name: 'jingle',
    namespace: NS,
    element: 'jingle',
    fields: {
        action: stanza.attribute('action'),
        initiator: stanza.attribute('initiator'),
        responder: stanza.attribute('responder'),
        sid: stanza.attribute('sid')
    }
});


exports.Content = stanza.define({
    name: '_jingleContent',
    namespace: NS,
    element: 'content',
    fields: {
        creator: stanza.attribute('creator'),
        disposition: stanza.attribute('disposition', 'session'),
        name: stanza.attribute('name'),
        senders: stanza.attribute('senders', 'both'),
        description: {
            get: function () {
                var opts = REGISTRY.descriptions;
                for (var i = 0, len = opts.length; i < len; i++) {
                    if (this._extensions[opts[i]]) {
                        return this._extensions[opts[i]];
                    }
                }
            },
            set: function (value) {
                var ext = '_' + value.descType;
                this[ext] = value;
            }
        },
        transport: {
            get: function () {
                var opts = REGISTRY.transports;
                for (var i = 0, len = opts.length; i < len; i++) {
                    if (this._extensions[opts[i]]) {
                        return this._extensions[opts[i]];
                    }
                }
            },
            set: function (value) {
                var ext = '_' + value.transType;
                this[ext] = value;
            }
        }
    }
});

exports.Reason = stanza.define({
    name: 'reason',
    namespace: NS,
    element: 'reason',
    fields: {
        condition: stanza.enumSub(NS, REASONS),
        alternativeSession: {
            get: function () {
                return stanza.getSubText(this.xml, NS, 'alternative-session');
            },
            set: function (value) {
                this.condition = 'alternative-session';
                stanza.setSubText(this.xml, NS, 'alternative-session', value);
            }
        },
        text: stanza.subText(NS, 'text')
    }
});


stanza.add(ErrorStanza, 'jingleCondition', stanza.enumSub(ERRNS, CONDITIONS));

stanza.extend(Iq, exports.Jingle);
stanza.extend(exports.Jingle, exports.Content, 'contents');
stanza.extend(exports.Jingle, exports.Reason);
