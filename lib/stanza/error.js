"use strict";

var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');


var ERR_NS = 'urn:ietf:params:xml:ns:xmpp-stanzas';
var CONDITIONS = [
    'bad-request', 'conflict', 'feature-not-implemented',
    'forbidden', 'gone', 'internal-server-error',
    'item-not-found', 'jid-malformed', 'not-acceptable',
    'not-allowed', 'not-authorized', 'payment-required',
    'recipient-unavailable', 'redirect',
    'registration-required', 'remote-server-not-found',
    'remote-server-timeout', 'resource-constraint',
    'service-unavailable', 'subscription-required',
    'undefined-condition', 'unexpected-request'
];


var ErrorStanza = module.exports = stanza.define({
    name: 'error',
    namespace: 'jabber:client',
    element: 'error',
    fields: {
        lang: {
            get: function () {
                return (this.parent || {}).lang || '';
            }
        },
        condition: {
            get: function () {
                var self = this;
                var result = [];
                CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, ERR_NS, condition);
                    if (exists.length) {
                        result.push(exists[0].tagName);
                    }
                });
                return result[0] || '';
            },
            set: function (value) {
                var self = this;
                CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, ERR_NS, condition);
                    if (exists.length) {
                        self.xml.removeChild(exists[0]);
                    }
                });

                if (value) {
                    var condition = stanza.createElement(ERR_NS, value);
                    this.xml.appendChild(condition);
                }
            }
        },
        gone: {
            get: function () {
                return stanza.getSubText(this.xml, ERR_NS, 'gone');
            },
            set: function (value) {
                this.condition = 'gone';
                stanza.setSubText(this.xml, ERR_NS, 'gone', value);
            }
        },
        redirect: {
            get: function () {
                return stanza.getSubText(this.xml, ERR_NS, 'redirect');
            },
            set: function (value) {
                this.condition = 'redirect';
                stanza.setSubText(this.xml, ERR_NS, 'redirect', value);
            }
        },
        code: stanza.attribute('code'),
        type: stanza.attribute('type'),
        by: util.jidAttribute('by'),
        $text: {
            get: function () {
                return stanza.getSubLangText(this.xml, ERR_NS, 'text', this.lang);
            }
        },
        text: {
            get: function () {
                var text = this.$text;
                return text[this.lang] || '';
            },
            set: function (value) {
                stanza.setSubLangText(this.xml, ERR_NS, 'text', value, this.lang);
            }
        }
    }
});


stanza.extend(Message, ErrorStanza);
stanza.extend(Presence, ErrorStanza);
stanza.extend(Iq, ErrorStanza);
