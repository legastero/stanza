import * as NS from '../namespaces';

const CONDITIONS = [
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

export default function(JXT) {
    const Utils = JXT.utils;

    JXT.define({
        element: 'error',
        fields: {
            $text: {
                get: function() {
                    return Utils.getSubLangText(this.xml, NS.STREAM_ERROR, 'text', this.lang);
                }
            },
            condition: Utils.enumSub(NS.STREAM_ERROR, CONDITIONS),
            lang: {
                get: function() {
                    return this._lang || '';
                },
                set: function(value) {
                    this._lang = value;
                }
            },
            seeOtherHost: {
                get: function() {
                    return Utils.getSubText(this.xml, NS.STREAM_ERROR, 'see-other-host');
                },
                set: function(value) {
                    this.condition = 'see-other-host';
                    Utils.setSubText(this.xml, NS.STREAM_ERROR, 'see-other-host', value);
                }
            },
            text: {
                get: function() {
                    const text = this.$text;
                    return text[this.lang] || '';
                },
                set: function(value) {
                    Utils.setSubLangText(this.xml, NS.STREAM_ERROR, 'text', value, this.lang);
                }
            }
        },
        name: 'streamError',
        namespace: NS.STREAM,
        topLevel: true
    });
}
