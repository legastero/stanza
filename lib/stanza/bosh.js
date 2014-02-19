"use strict";

var stanza = require('jxt');
var util = require('./util');

var NS = 'http://jabber.org/protocol/httpbind';
var XMPP_NS = 'urn:xmpp:xbosh';


module.exports = stanza.define({
    name: 'bosh',
    namespace: NS,
    element: 'body',
    prefixes: {
        xmpp: XMPP_NS,
        stream: 'http://etherx.jabber.org/streams'
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
        version: stanza.attributeNS(XMPP_NS, 'version', '1.0'),
        restart: {
            get: function () {
                var val = this.xml.getAttributeNS(XMPP_NS, 'restart') || '';
                return val === true || val === '1';
            },
            set: function (value) {
                if (value) {
                    this.xml.setAttributeNS(XMPP_NS, 'restart', '1');
                } else {
                    this.xml.removeAttributeNS(XMPP_NS, 'restart');
                }
            }
        },
        restartLogic: {
            get: function () {
                var val = this.xml.getAttributeNS(XMPP_NS, 'restartlogic') || '';
                return val === true || val === '1';
            },
            set: function (value) {
                if (value) {
                    this.xml.setAttributeNS(XMPP_NS, 'restartlogic', '1');
                } else {
                    this.xml.removeAttributeNS(XMPP_NS, 'restartlogic');
                }
            }
        },
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
