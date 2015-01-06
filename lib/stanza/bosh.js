'use strict';

var NS = 'http://jabber.org/protocol/httpbind';
var XMPP_NS = 'urn:xmpp:xbosh';


module.exports = function (stanza) {
    var types = stanza.utils;

    stanza.define({
        name: 'bosh',
        namespace: NS,
        element: 'body',
        prefixes: {
            xmpp: XMPP_NS
        },
        fields: {
            accept: types.attribute('accept'),
            ack: types.numberAttribute('ack'),
            authid: types.attribute('authid'),
            charsets: types.attribute('charsets'),
            condition: types.attribute('condition'),
            content: types.attribute('content'),
            from: types.jidAttribute('from', true),
            hold: types.numberAttribute('hold'),
            inactivity: types.numberAttribute('inactivity'),
            key: types.attribute('key'),
            maxpause: types.numberAttribute('maxpause'),
            newKey: types.attribute('newkey'),
            pause: types.numberAttribute('pause'),
            polling: types.numberAttribute('polling'),
            resport: types.numberAttribute('report'),
            requests: types.numberAttribute('requests'),
            rid: types.numberAttribute('rid'),
            sid: types.attribute('sid'),
            stream: types.attribute('stream'),
            time: types.attribute('time'),
            to: types.jidAttribute('to', true),
            type: types.attribute('type'),
            ver: types.attribute('ver'),
            wait: types.numberAttribute('wait'),
            uri: types.textSub(NS, 'uri'),
            lang: types.langAttribute(),
            // These three should be using namespaced attributes, but browsers are stupid
            // when it comes to serializing attributes with namespaces
            version: types.attribute('xmpp:version', '1.0'),
            restart: types.attribute('xmpp:restart'),
            restartLogic: types.boolAttribute('xmpp:restartLogic'),
            payload: {
                get: function () {
                    var results = [];
                    for (var i = 0, len = this.xml.childNodes.length; i < len; i++)  {
                        var obj = stanza.build(this.xml.childNodes[i]);
                        if (obj !== undefined) {
                            results.push(obj);
                        }
                    }
                    return results;
                },
                set: function (values) {
                    var self = this;
                    values.forEach(function (types) {
                        self.xml.appendChild(types.xml);
                    });
                }
            }
        }
    });
};
