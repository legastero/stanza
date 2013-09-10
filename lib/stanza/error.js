var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');
var JID = require('../jid');


function Error(data, xml) {
    return stanza.init(this, xml, data);
}
Error.prototype = {
    constructor: {
        value: Error
    },
    _name: 'error',
    NS: 'jabber:client',
    EL: 'error',
    _ERR_NS: 'urn:ietf:params:xml:ns:xmpp-stanzas',
    _CONDITIONS: [
        'bad-request', 'conflict', 'feature-not-implemented',
        'forbidden', 'gone', 'internal-server-error',
        'item-not-found', 'jid-malformed', 'not-acceptable',
        'not-allowed', 'not-authorized', 'payment-required',
        'recipient-unavailable', 'redirect',
        'registration-required', 'remote-server-not-found',
        'remote-server-timeout', 'resource-constraint',
        'service-unavailable', 'subscription-required',
        'undefined-condition', 'unexpected-request'
    ],
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        if (this.parent) {
            return this.parent.lang;
        }
        return '';
    },
    get condition() {
        var self = this;
        var result = [];
        this._CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, self._ERR_NS, condition);
            if (exists.length) {
                result.push(exists[0].tagName);
            }
        });
        return result[0] || '';
    },
    set condition(value) {
        var self = this;
        this._CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, self._ERR_NS, condition);
            if (exists.length) {
                self.xml.removeChild(exists[0]);
            }
        });

        if (value) {
            var condition = document.createElementNS(this._ERR_NS, value);
            condition.setAttribute('xmlns', this._ERR_NS);
            this.xml.appendChild(condition);
        }
    },
    get gone() {
        return stanza.getSubText(this.xml, this._ERR_NS, 'gone');
    },
    set gone(value) {
        this.condition = 'gone';
        stanza.setSubText(this.xml, this._ERR_NS, 'gone', value);
    },
    get redirect() {
        return stanza.getSubText(this.xml, this._ERR_NS, 'redirect');
    },
    set redirect(value) {
        this.condition = 'redirect';
        stanza.setSubText(this.xml, this._ERR_NS, 'redirect', value);
    },
    get code() {
        return stanza.getAttribute(this.xml, 'code');
    },
    set code(value) {
        stanza.setAttribute(this.xml, 'code', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'type', value);
    },
    get by() {
        return new JID(stanza.getAttribute(this.xml, 'by'));
    },
    set by(value) {
        stanza.setAttribute(this.xml, 'by', value.toString());
    },
    get $text() {
        return stanza.getSubLangText(this.xml, this._ERR_NS, 'text', this.lang);
    },
    set text(value) {
        stanza.setSubLangText(this.xml, this._ERR_NS, 'text', value, this.lang);
    },
    get text() {
        var text = this.$text;
        return text[this.lang] || '';
    },
};

stanza.extend(Message, Error);
stanza.extend(Presence, Error);
stanza.extend(Iq, Error);


module.exports = Error;
