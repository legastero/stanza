var _ = require('lodash'),
    stanza = require('./stanza');


function StreamError(data, xml) {
    return stanza.init(this, xml, data);
}
StreamError.prototype = {
    constructor: {
        value: StreamError
    },
    _name: 'streamError',
    NS: 'http://etherx.jabber.org/streams',
    EL: 'error',
    _ERR_NS: 'urn:ietf:params:xml:ns:xmpp-streams',
    _CONDITIONS: [
        'bad-format', 'bad-namespace-prefix', 'conflict',
        'connection-timeout', 'host-gone', 'host-unknown',
        'improper-addressing', 'internal-server-error', 'invalid-from',
        'invalid-namespace', 'invalid-xml', 'not-authorized',
        'not-well-formed', 'policy-violation', 'remote-connection-failed',
        'reset', 'resource-constraint', 'restricted-xml', 'see-other-host',
        'system-shutdown', 'undefined-condition', 'unsupported-encoding',
        'unsupported-feature', 'unsupported-stanza-type',
        'unsupported-version'
    ],
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        return this._lang || '';
    },
    set lang(value) {
        this._lang = value;
    },
    get condition() {
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
    set condition(value) {
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
    get seeOtherHost() {
        return stanza.getSubText(this.xml, this._ERR_NS, 'see-other-host');
    },
    set seeOtherHost(value) {
        this.condition = 'see-other-host';
        stanza.setSubText(this.xml, this._ERR_NS, 'see-other-host', value);
    },
    get text() {
        var text = this.$text;
        return text[this.lang] || '';
    },
    get $text() {
        return stanza.getSubLangText(this.xml, this._ERR_NS, 'text', this.lang);
    },
    set text(value) {
        stanza.setSubLangText(this.xml, this._ERR_NS, 'text', value, this.lang);
    }
};

stanza.topLevel(StreamError);


module.exports = StreamError;
