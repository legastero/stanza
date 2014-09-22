'use strict';


module.exports = function (stanza) {
    var nick = stanza.utils.subText('http://jabber.org/protocol/nick', 'nick');
    
    
    stanza.withPubsubItem(function (Item) {
        stanza.add(Item, 'nick', nick);
    });

    stanza.withPresence(function (Presence) {
        stanza.add(Presence, 'nick', nick);
    });

    stanza.withMessage(function (Message) {
        stanza.add(Message, 'nick', nick);
    });
};
