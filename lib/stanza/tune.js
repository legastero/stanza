'use strict';
var stanza = require('jxt');

var Item = require('./pubsub').Item;
var EventItem = require('./pubsubEvents').EventItem;
var Message = require('./message');


var NS = 'http://jabber.org/protocol/tune';


var Tune = module.exports = stanza.define({
    name: 'tune',
    namespace: NS,
    element: 'tune',
    fields: {
        artist: stanza.subText(NS, 'artist'),
        length: stanza.numberSub(NS, 'length'),
        rating: stanza.numberSub(NS, 'rating'),
        source: stanza.subText(NS, 'source'),
        title: stanza.subText(NS, 'title'),
        track: stanza.subText(NS, 'track'),
        uri: stanza.subText(NS, 'uri')
    }
});


stanza.extend(Item, Tune);
stanza.extend(EventItem, Tune);
stanza.extend(Message, Tune);
