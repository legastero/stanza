'use strict';

var NS = 'http://jabber.org/protocol/tune';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Tune = stanza.define({
        name: 'tune',
        namespace: NS,
        element: 'tune',
        fields: {
            artist: types.textSub(NS, 'artist'),
            length: types.numberSub(NS, 'length'),
            rating: types.numberSub(NS, 'rating'),
            source: types.textSub(NS, 'source'),
            title: types.textSub(NS, 'title'),
            track: types.textSub(NS, 'track'),
            uri: types.textSub(NS, 'uri')
        }
    });
    
    
    stanza.withPubsubItem(function (Item) {
        stanza.extend(Item, Tune);
    });

    stanza.withMessage(function (Message) {
        stanza.extend(Message, Tune);
    });
};
