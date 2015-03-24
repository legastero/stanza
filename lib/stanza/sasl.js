'use strict';

var NS = 'urn:ietf:params:xml:ns:xmpp-sasl';
var CONDITIONS = [
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
    'temporary-auth-failure'
];


module.exports = function (stanza) {
    var types = stanza.utils;

    var Mechanisms = stanza.define({
        name: 'sasl',
        namespace: NS,
        element: 'mechanisms',
        fields: {
            mechanisms: types.multiTextSub(NS, 'mechanism')
        }
    });

    stanza.define({
        name: 'saslAuth',
        eventName: 'sasl:auth',
        namespace: NS,
        element: 'auth',
        topLevel: true,
        fields: {
            value: types.text(),
            mechanism: types.attribute('mechanism')
        }
    });

    stanza.define({
        name: 'saslChallenge',
        eventName: 'sasl:challenge',
        namespace: NS,
        element: 'challenge',
        topLevel: true,
        fields: {
            value: types.text()
        }
    });

    stanza.define({
        name: 'saslResponse',
        eventName: 'sasl:response',
        namespace: NS,
        element: 'response',
        topLevel: true,
        fields: {
            value: types.text()
        }
    });

    stanza.define({
        name: 'saslAbort',
        eventName: 'sasl:abort',
        namespace: NS,
        element: 'abort',
        topLevel: true
    });

    stanza.define({
        name: 'saslSuccess',
        eventName: 'sasl:success',
        namespace: NS,
        element: 'success',
        topLevel: true,
        fields: {
            value: types.text()
        }
    });

    stanza.define({
        name: 'saslFailure',
        eventName: 'sasl:failure',
        namespace: NS,
        element: 'failure',
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
            condition: types.enumSub(NS, CONDITIONS),
            $text: {
                get: function () {
                    return types.getSubLangText(this.xml, NS, 'text', this.lang);
                }
            },
            text: {
                get: function () {
                    var text = this.$text;
                    return text[this.lang] || '';
                },
                set: function (value) {
                    types.setSubLangText(this.xml, NS, 'text', value, this.lang);
                }
            }
        }
    });


    stanza.withStreamFeatures(function (StreamFeatures) {
        stanza.extend(StreamFeatures, Mechanisms);
    });
};
