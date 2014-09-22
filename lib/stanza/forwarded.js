'use strict';

module.exports = function (stanza) {
    var Forwarded = stanza.define({
        name: 'forwarded',
        eventName: 'forward',
        namespace: 'urn:xmpp:forward:0',
        element: 'forwarded'
    });
    
    
    stanza.withMessage(function (Message) {
        stanza.extend(Message, Forwarded);
        stanza.extend(Forwarded, Message);
    });

    stanza.withPresence(function (Presence) {
        stanza.extend(Forwarded, Presence);
    });

    stanza.withIq(function (Iq) {
        stanza.extend(Forwarded, Iq);
    });

    stanza.withDefinition('delay', 'urn:xmpp:delay', function (Delayed) {
        stanza.extend(Forwarded, Delayed);
    });
};
