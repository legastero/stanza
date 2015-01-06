'use strict';

var NS = 'urn:xmpp:psa';
var CONDITIONS = [
    'server-unavailable', 'connection-paused'
];


module.exports = function (stanza) {
    var types = stanza.utils;

    var PSA = stanza.define({
        name: 'state',
        namespace: NS,
        element: 'state-annotation',
        fields: {
            from: types.jidAttribute('from'),
            condition: types.enumSub(NS, CONDITIONS),
            description: types.textSub(NS, 'description')
        }
    });
    
    
    stanza.withPresence(function (Presence) {
        stanza.extend(Presence, PSA);
    });
};
