import * as NS from '../namespaces';

const CONDITIONS = [
    'aborted',
    'account-disabled',
    'credentials-expired',
    'encryption-required',
    'incorrect-encoding',
    'invalid-authzid',
    'invalid-mechanism',
    'malformed-request',
    'mechanism-too-weak',
    'not-authorized',
    'temporary-auth-failure',
    'not-supported'
];

export default function(JXT) {
    const Utils = JXT.utils;

    const Mechanisms = JXT.define({
        element: 'mechanisms',
        fields: {
            mechanisms: Utils.multiTextSub(NS.SASL, 'mechanism')
        },
        name: 'sasl',
        namespace: NS.SASL
    });

    JXT.define({
        element: 'auth',
        eventName: 'sasl:auth',
        fields: {
            mechanism: Utils.attribute('mechanism'),
            value: Utils.text()
        },
        name: 'saslAuth',
        namespace: NS.SASL,
        topLevel: true
    });

    JXT.define({
        element: 'challenge',
        eventName: 'sasl:challenge',
        fields: {
            value: Utils.text()
        },
        name: 'saslChallenge',
        namespace: NS.SASL,
        topLevel: true
    });

    JXT.define({
        element: 'response',
        eventName: 'sasl:response',
        fields: {
            value: Utils.text()
        },
        name: 'saslResponse',
        namespace: NS.SASL,
        topLevel: true
    });

    JXT.define({
        element: 'abort',
        eventName: 'sasl:abort',
        name: 'saslAbort',
        namespace: NS.SASL,
        topLevel: true
    });

    JXT.define({
        element: 'success',
        eventName: 'sasl:success',
        fields: {
            value: Utils.text()
        },
        name: 'saslSuccess',
        namespace: NS.SASL,
        topLevel: true
    });

    JXT.define({
        element: 'failure',
        eventName: 'sasl:failure',
        fields: {
            $text: {
                get: function() {
                    return Utils.getSubLangText(this.xml, NS.SASL, 'text', this.lang);
                }
            },
            condition: Utils.enumSub(NS.SASL, CONDITIONS),
            lang: {
                get: function() {
                    return this._lang || '';
                },
                set: function(value) {
                    this._lang = value;
                }
            },
            text: {
                get: function() {
                    const text = this.$text;
                    return text[this.lang] || '';
                },
                set: function(value) {
                    Utils.setSubLangText(this.xml, NS.SASL, 'text', value, this.lang);
                }
            }
        },
        name: 'saslFailure',
        namespace: NS.SASL,
        topLevel: true
    });

    JXT.extendStreamFeatures(Mechanisms);
}
