'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    stanza.define({
        name: 'stream',
        namespace: 'http://etherx.jabber.org/streams',
        element: 'stream',
        fields: {
            lang: types.langAttribute(),
            id: types.attribute('id'),
            version: types.attribute('version', '1.0'),
            to: types.jidAttribute('to', true),
            from: types.jidAttribute('from', true)
        }
    });
};
