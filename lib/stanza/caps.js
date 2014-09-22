'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Caps = stanza.define({
        name: 'caps',
        namespace: 'http://jabber.org/protocol/caps',
        element: 'c',
        fields: {
            ver: types.attribute('ver'),
            node: types.attribute('node'),
            hash: types.attribute('hash'),
            ext: types.attribute('ext')
        }
    });
    
    stanza.withPresence(function (Presence) {
        stanza.extend(Presence, Caps);
    });

    stanza.withStreamFeatures(function (StreamFeatures) {
        stanza.extend(StreamFeatures, Caps);
    });
};
