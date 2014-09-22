'use strict';

var NS = 'urn:xmpp:invisible:0';


module.exports = function (stanza) {
    stanza.withIq(function (Iq) {
        stanza.add(Iq, 'visible', stanza.utils.boolSub(NS, 'visible'));
        stanza.add(Iq, 'invisible', stanza.utils.boolSub(NS, 'invisible'));
    });
};
