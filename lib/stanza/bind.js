'use strict';

var NS = 'urn:ietf:params:xml:ns:xmpp-bind';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Bind = stanza.define({
        name: 'bind',
        namespace: NS,
        element: 'bind',
        fields: {
            resource: types.textSub(NS, 'resource'),
            jid: types.jidSub(NS, 'jid')
        }
    });

    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Bind);
    });
    stanza.withStreamFeatures(function (StreamFeatures) {
        stanza.extend(StreamFeatures, Bind);
    });
};
