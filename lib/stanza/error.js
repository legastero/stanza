var _ = require('../lodash'),
    stanza = require('./stanza'),
    Message = require('./message').Message,
    Presence = require('./presence').Presence,
    Iq = require('./iq').Iq;


function Error(data, xml) {
    return stanza.init(this, xml, data);
}
Error.prototype = {
    constructor: {
        value: Error
    },
    name: 'error',
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
    get condition () {
        var self = this;
        var result = [];
        _.each(this._CONDITIONS, function (condition) {
            var exists = stanza.find(self.xml, self._ERR_NS, condition);
            if (exists.length) {
                result.push(exists[0].tagName);
            }
        });
        return result[0] || '';
    },
    set condition (value) {
        var self = this;
        _.each(this._CONDITIONS, function (condition) {
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
    get gone () {
        return stanza.getSubText(this.xml, this._ERR_NS, 'gone');
    },
    set gone (value) {
        this.condition = 'gone';
        stanza.setSubText(this.xml, this._ERR_NS, 'gone', value);
    },
    get redirect () {
        return stanza.getSubText(this.xml, this._ERR_NS, 'redirect');
    },
    set redirect (value) {
        this.condition = 'redirect';
        stanza.setSubText(this.xml, this._ERR_NS, 'redirect', value);
    },
    get code () {
        return this.xml.getAttribute('code') || '';
    },
    set code (value) {
        this.xml.setAttribute('code', value);
    },
    get type () {
        return this.xml.getAttribute('type') || '';
    },
    set type (value) {
        this.xml.setAttribute('type', value);
    },
    get by () {
        return this.xml.getAttribute('by') || '';
    },
    set by (value) {
        this.xml.setAttribute('by', value);
    },
    get $text () {
        return stanza.getSubLangText(this.xml, this._ERR_NS, 'text', this.lang);
    },
    set text (value) {
        stanza.setSubLangText(this.xml, this._ERR_NS, 'text', value, this.lang);
    }
};

stanza.extend(Message, Error);
stanza.extend(Presence, Error);
stanza.extend(Iq, Error);


exports.Error = Error;
