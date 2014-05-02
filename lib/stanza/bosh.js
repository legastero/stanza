'use strict';

var stanza = require('jxt');
var util = require('./util');

var NS = 'http://jabber.org/protocol/httpbind';
var XMPP_NS = 'urn:xmpp:xbosh';


module.exports = stanza.define({
    name: 'bosh',
    namespace: NS,
    element: 'body',
    prefixes: {
        xmpp: XMPP_NS
    },
    fields: {
        accept: stanza.attribute('accept'),
        ack: stanza.numberAttribute('ack'),
        authid: stanza.attribute('authid'),
        charsets: stanza.attribute('charsets'),
        condition: stanza.attribute('condition'),
        content: stanza.attribute('content'),
        from: util.jidAttribute('from'),
        hold: stanza.numberAttribute('hold'),
        inactivity: stanza.numberAttribute('inactivity'),
        key: stanza.attribute('key'),
        maxpause: stanza.numberAttribute('maxpause'),
        newKey: stanza.attribute('newkey'),
        pause: stanza.numberAttribute('pause'),
        polling: stanza.numberAttribute('polling'),
        resport: stanza.numberAttribute('report'),
        requests: stanza.numberAttribute('requests'),
        rid: stanza.numberAttribute('rid'),
        sid: stanza.attribute('sid'),
        stream: stanza.attribute('stream'),
        time: stanza.attribute('time'),
        to: util.jidAttribute('to'),
        type: stanza.attribute('type'),
        ver: stanza.attribute('ver'),
        wait: stanza.numberAttribute('wait'),
        uri: stanza.subText(NS, 'uri'),
        lang: stanza.langAttribute(),
        // These three should be using namespaced attributes, but browsers are stupid
        // when it comes to serializing attributes with namespaces
        version: stanza.attribute('xmpp:version', '1.0'),
        restart: stanza.attribute('xmpp:restart'),
        restartLogic: stanza.boolAttribute('xmpp:restartLogic'),
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
                values.forEach(function (stanza) {
                    self.xml.appendChild(stanza.xml);
                });
            }
        }
    }
});
