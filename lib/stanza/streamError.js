'use strict';

var ERR_NS = 'urn:ietf:params:xml:ns:xmpp-streams';
var CONDITIONS = [
    'bad-format',
    'bad-namespace-prefix',
    'conflict',
    'connection-timeout',
    'host-gone',
    'host-unknown',
    'improper-addressing',
    'internal-server-error',
    'invalid-from',
    'invalid-namespace',
    'invalid-xml',
    'not-authorized',
    'not-well-formed',
    'policy-violation',
    'remote-connection-failed',
    'reset',
    'resource-constraint',
    'restricted-xml',
    'see-other-host',
    'system-shutdown',
    'undefined-condition',
    'unsupported-encoding',
    'unsupported-feature',
    'unsupported-stanza-type',
    'unsupported-version'
];


module.exports = function (stanza) {
    var types = stanza.utils;

    stanza.define({
        name: 'streamError',
        namespace: 'http://etherx.jabber.org/streams',
        element: 'error',
        topLevel: true,
        fields: {
            lang: {
                get: function () {
                    return this._lang || '';
                },
                set: function (value) {
                    this._lang = value;
                }
            },
            condition: types.enumSub(ERR_NS, CONDITIONS),
            seeOtherHost: {
                get: function () {
                    return types.getSubText(this.xml, ERR_NS, 'see-other-host');
                },
                set: function (value) {
                    this.condition = 'see-other-host';
                    types.setSubText(this.xml, ERR_NS, 'see-other-host', value);
                }
            },
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
};
