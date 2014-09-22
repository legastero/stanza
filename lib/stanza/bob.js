'use strict';

var NS = 'urn:xmpp:bob';


module.exports = function (stanza) {
    var types = stanza.utils;

    var BOB = stanza.define({
        name: 'bob',
        namespace: NS,
        element: 'data',
        fields: {
            cid: types.attribute('cid'),
            maxAge: types.numberAttribute('max-age'),
            type: types.attribute('type'),
            data: types.text()
        }
    });


    stanza.withIq(function (Iq) {
        stanza.extend(Iq, BOB);
    });

    stanza.withMessage(function (Message) {
        stanza.extend(Message, BOB);
    });

    stanza.withPresence(function (Presence) {
        stanza.extend(Presence, BOB);
    });
};
