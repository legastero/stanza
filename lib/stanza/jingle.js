'use strict';

var NS = 'urn:xmpp:jingle:1';
var ERRNS = 'urn:xmpp:jingle:errors:1';
var CONDITIONS = ['out-of-order', 'tie-break', 'unknown-session', 'unsupported-info'];
var REASONS = [
    'alternative-session',
    'busy',
    'cancel',
    'connectivity-error',
    'decline',
    'expired',
    'failed-application',
    'failed-transport',
    'general-error',
    'gone',
    'incompatible-parameters',
    'media-error',
    'security-error',
    'success',
    'timeout',
    'unsupported-applications',
    'unsupported-transports'
];


module.exports = function (stanza) {
    var types = stanza.utils;

    var Jingle = stanza.define({
        name: 'jingle',
        namespace: NS,
        element: 'jingle',
        fields: {
            action: types.attribute('action'),
            initiator: types.attribute('initiator'),
            responder: types.attribute('responder'),
            sid: types.attribute('sid')
        }
    });
    
    
    var Content = stanza.define({
        name: '_jingleContent',
        namespace: NS,
        element: 'content',
        fields: {
            creator: types.attribute('creator'),
            disposition: types.attribute('disposition', 'session'),
            name: types.attribute('name'),
            senders: types.attribute('senders', 'both'),
            description: {
                get: function () {
                    var opts = stanza.tagged('jingle-description').map(function (Description) {
                        return Description.prototype._name;
                    });
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
                    var opts = stanza.tagged('jingle-transport').map(function (Transport) {
                        return Transport.prototype._name;
                    });
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
    
    var Reason = stanza.define({
        name: 'reason',
        namespace: NS,
        element: 'reason',
        fields: {
            condition: types.enumSub(NS, REASONS),
            alternativeSession: {
                get: function () {
                    return types.getSubText(this.xml, NS, 'alternative-session');
                },
                set: function (value) {
                    this.condition = 'alternative-session';
                    types.setSubText(this.xml, NS, 'alternative-session', value);
                }
            },
            text: types.textSub(NS, 'text')
        }
    });
    
    
    stanza.extend(Jingle, Content, 'contents');
    stanza.extend(Jingle, Reason);

    stanza.withStanzaError(function (ErrorStanza) {
        stanza.add(ErrorStanza, 'jingleCondition', types.enumSub(ERRNS, CONDITIONS));
    });
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Jingle);
    });
};
