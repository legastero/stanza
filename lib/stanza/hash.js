'use strict';


module.exports = function (stanza) {
    stanza.define({
        name: 'hash',
        namespace: 'urn:xmpp:hashes:1',
        element: 'hash',
        fields: {
            algo: stanza.utils.attribute('algo'),
            value: stanza.utils.text()
        }
    });
};
