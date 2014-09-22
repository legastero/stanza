'use strict';

var NS = 'urn:xmpp:ping';


module.exports = function (stanza) {
    var Ping = stanza.define({
        name: 'ping',
        namespace: NS,
        element: 'ping'
    });
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Ping);
    });
};
