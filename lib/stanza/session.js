'use strict';

var NS = 'urn:ietf:params:xml:ns:xmpp-session';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Session = stanza.define({
        name: 'session',
        namespace: NS,
        element: 'session',
        fields: {
            required: types.boolSub(NS, 'required'),
            optional: types.boolSub(NS, 'optional')
        }
    });
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Session);
    });
    stanza.withStreamFeatures(function (StreamFeatures) {
        stanza.extend(StreamFeatures, Session);
    });
};
