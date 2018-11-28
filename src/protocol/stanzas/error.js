import * as NS from '../namespaces';

const CONDITIONS = [
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

export default function(JXT) {
    const Utils = JXT.utils;

    const StanzaError = JXT.define({
        element: 'error',
        fields: {
            $text: {
                get: function() {
                    return Utils.getSubLangText(this.xml, NS.STANZA_ERROR, 'text', this.lang);
                }
            },
            by: Utils.jidAttribute('by'),
            code: Utils.attribute('code'),
            condition: Utils.enumSub(NS.STANZA_ERROR, CONDITIONS),
            gone: {
                get: function() {
                    return Utils.getSubText(this.xml, NS.STANZA_ERROR, 'gone');
                },
                set: function(value) {
                    this.condition = 'gone';
                    Utils.setSubText(this.xml, NS.STANZA_ERROR, 'gone', value);
                }
            },
            lang: {
                get: function() {
                    return (this.parent || {}).lang || '';
                }
            },
            redirect: {
                get: function() {
                    return Utils.getSubText(this.xml, NS.STANZA_ERROR, 'redirect');
                },
                set: function(value) {
                    this.condition = 'redirect';
                    Utils.setSubText(this.xml, NS.STANZA_ERROR, 'redirect', value);
                }
            },
            text: {
                get: function() {
                    const text = this.$text;
                    return text[this.lang] || '';
                },
                set: function(value) {
                    Utils.setSubLangText(this.xml, NS.STANZA_ERROR, 'text', value, this.lang);
                }
            },
            type: Utils.attribute('type')
        },
        name: 'error',
        namespace: NS.CLIENT
    });

    JXT.extendMessage(StanzaError);
    JXT.extendPresence(StanzaError);
    JXT.extendIQ(StanzaError);
}
