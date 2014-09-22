'use strict';

var NS = 'http://jabber.org/protocol/tune';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Tune = module.exports = stanza.define({
        name: 'tune',
        namespace: NS,
        element: 'tune',
        fields: {
            artist: types.subText(NS, 'artist'),
            length: types.numberSub(NS, 'length'),
            rating: types.numberSub(NS, 'rating'),
            source: types.subText(NS, 'source'),
            title: types.subText(NS, 'title'),
            track: types.subText(NS, 'track'),
            uri: types.subText(NS, 'uri')
        }
    });
    
    
    stanza.withPubsubItem(function (Item) {
        stanza.extend(Item, Tune);
    });

    stanza.withMessage(function (Message) {
        stanza.extend(Message, Tune);
    });
};
