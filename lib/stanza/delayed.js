'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    var DelayedDelivery = stanza.define({
        name: 'delay',
        namespace: 'urn:xmpp:delay',
        element: 'delay',
        fields: {
            from: types.jidAttribute('from'),
            stamp: types.dateAttribute('stamp'),
            reason: types.text()
        }
    });
    
    stanza.withMessage(function (Message) {
        stanza.extend(Message, DelayedDelivery);
    });

    stanza.withPresence(function (Presence) {
        stanza.extend(Presence, DelayedDelivery);
    });
};
