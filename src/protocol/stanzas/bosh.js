import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    JXT.define({
        element: 'body',
        fields: {
            accept: Utils.attribute('accept'),
            ack: Utils.numberAttribute('ack'),
            authid: Utils.attribute('authid'),
            charsets: Utils.attribute('charsets'),
            condition: Utils.attribute('condition'),
            content: Utils.attribute('content'),
            from: Utils.jidAttribute('from', true),
            hold: Utils.numberAttribute('hold'),
            inactivity: Utils.numberAttribute('inactivity'),
            key: Utils.attribute('key'),
            lang: Utils.langAttribute(),
            maxpause: Utils.numberAttribute('maxpause'),
            newKey: Utils.attribute('newkey'),
            pause: Utils.numberAttribute('pause'),
            payload: {
                get: function() {
                    const results = [];

                    for (let i = 0, len = this.xml.childNodes.length; i < len; i++) {
                        const obj = JXT.build(this.xml.childNodes[i]);

                        if (obj !== undefined) {
                            results.push(obj);
                        }
                    }

                    return results;
                },
                set: function(values) {
                    for (const types of values) {
                        this.xml.appendChild(types.xml);
                    }
                }
            },
            polling: Utils.numberAttribute('polling'),
            requests: Utils.numberAttribute('requests'),
            resport: Utils.numberAttribute('report'),
            restart: Utils.attribute('xmpp:restart'),
            restartLogic: Utils.boolAttribute('xmpp:restartLogic'),
            rid: Utils.numberAttribute('rid'),
            sid: Utils.attribute('sid'),
            stream: Utils.attribute('stream'),
            time: Utils.attribute('time'),
            to: Utils.jidAttribute('to', true),
            type: Utils.attribute('type'),
            uri: Utils.textSub(NS.BOSH, 'uri'),
            ver: Utils.attribute('ver'),
            // These three should be using namespaced attributes, but browsers are stupid
            // when it comes to serializing attributes with namespaces
            version: Utils.attribute('xmpp:version', '1.0'),
            wait: Utils.numberAttribute('wait')
        },
        name: 'bosh',
        namespace: NS.BOSH,
        prefixes: {
            xmpp: NS.BOSH_XMPP
        }
    });
}
