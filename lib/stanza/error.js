'use strict';

var ERR_NS = 'urn:ietf:params:xml:ns:xmpp-stanzas';
var CONDITIONS = [
    'bad-request',
    'conflict',
    'feature-not-implemented',
    'forbidden',
    'gone',
    'internal-server-error',
    'item-not-found',
    'jid-malformed',
    'not-acceptable',
    'not-allowed',
    'not-authorized',
    'payment-required',
    'recipient-unavailable',
    'redirect',
    'registration-required',
    'remote-server-not-found',
    'remote-server-timeout',
    'resource-constraint',
    'service-unavailable',
    'subscription-required',
    'undefined-condition',
    'unexpected-request'
];


module.exports = function (stanza) {
    var types = stanza.utils;

    var ErrorStanza = stanza.define({
        name: 'error',
        namespace: 'jabber:client',
        element: 'error',
        fields: {
            lang: {
                get: function () {
                    return (this.parent || {}).lang || '';
                }
            },
            condition: types.enumSub(ERR_NS, CONDITIONS),
            gone: {
                get: function () {
                    return types.getSubText(this.xml, ERR_NS, 'gone');
                },
                set: function (value) {
                    this.condition = 'gone';
                    types.setSubText(this.xml, ERR_NS, 'gone', value);
                }
            },
            redirect: {
                get: function () {
                    return types.getSubText(this.xml, ERR_NS, 'redirect');
                },
                set: function (value) {
                    this.condition = 'redirect';
                    types.setSubText(this.xml, ERR_NS, 'redirect', value);
                }
            },
            code: types.attribute('code'),
            type: types.attribute('type'),
            by: types.jidAttribute('by'),
            $text: {
                get: function () {
                    return types.getSubLangText(this.xml, ERR_NS, 'text', this.lang);
                }
            },
            text: {
                get: function () {
                    var text = this.$text;
                    return text[this.lang] || '';
                },
                set: function (value) {
                    types.setSubLangText(this.xml, ERR_NS, 'text', value, this.lang);
                }
            }
        }
    });
    
    
    stanza.withMessage(function (Message) {
        stanza.extend(Message, ErrorStanza);
    });
    stanza.withPresence(function (Presence) {
        stanza.extend(Presence, ErrorStanza);
    });
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, ErrorStanza);
    });
};
