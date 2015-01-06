'use strict';

var JID = require('xmpp-jid').JID;
var NS = 'urn:xmpp:jidprep:0';


module.exports = function (stanza) {
    var types = stanza.utils;

    stanza.withIq(function (Iq) {
        stanza.add(Iq, 'jidPrep', {
            get: function () {
                var data = types.getSubText(this.xml, NS, 'jid');
                if (data) {
                    var jid = new JID(data);
                    jid.prepped = true;
                    return jid;
                }
            },
            set: function (value) {
                types.setSubText(this.xml, NS, 'jid', (value || '').toString());
            }
        });
    });
};
