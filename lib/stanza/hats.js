'use strict';

var NS = 'urn:xmpp:hats:0';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Hat = stanza.define({
        name: '_hat',
        namespace: NS,
        element: 'hat',
        fields: {
            lang: types.langAttribute(),
            name: types.attribute('name'),
            displayName: types.attribute('displayName')
        }
    });
    
    
    stanza.withPresence(function (Presence) {
        stanza.add(Presence, 'hats', types.subMultiExtension(NS, 'hats', Hat));
    });
};
