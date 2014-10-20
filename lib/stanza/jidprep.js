var stanza = require('jxt');
var Iq = require('./iq');
var JID = require('xmpp-jid').JID;

var NS = 'urn:xmpp:jidprep:0';


stanza.add(Iq, 'jidPrep', {
    get: function () {
        var data = stanza.getSubText(this.xml, NS, 'jid');
        if (data) {
            var jid = new JID(data);
            jid.prepped = true;
            return jid;
        }
    },
    set: function (value) {
        stanza.setSubText(this.xml, NS, 'jid', (value || '').toString());
    }
});
