'use strict';

var NS = 'urn:ietf:params:xml:ns:xmpp-framing';


module.exports = function (stanza) {
    var types = stanza.utils;

    stanza.define({
        name: 'openStream',
        namespace: NS,
        element: 'open',
        topLevel: true,
        fields: {
            lang: types.langAttribute(),
            id: types.attribute('id'),
            version: types.attribute('version', '1.0'),
            to: types.jidAttribute('to', true),
            from: types.jidAttribute('from', true)
        }
    });
    
    stanza.define({
        name: 'closeStream',
        namespace: NS,
        element: 'close',
        topLevel: true,
        fields: {
            seeOtherURI: types.attribute('see-other-uri')
        }
    });
};
