'use strict';

var stanza = require('jxt');
var Item = require('./pubsub').Item;
var EventItem = require('./pubsub').EventItem;

var NS = 'http://jabber.org/protocol/geoloc';

var GeoLoc = module.exports = stanza.define({
    name: 'geoloc',
    namespace: NS,
    element: 'geoloc',
    fields: {
        accuracy: stanza.numberSub(NS, 'accuracy', true),
        altitude: stanza.numberSub(NS, 'alt', true),
        area: stanza.subText(NS, 'area'),
        heading: stanza.numberSub(NS, 'bearing', true),
        bearing: stanza.numberSub(NS, 'bearing', true),
        building: stanza.subText(NS, 'building'),
        country: stanza.subText(NS, 'country'),
        countrycode: stanza.subText(NS, 'countrycode'),
        datum: stanza.subText(NS, 'datum'),
        description: stanza.subText(NS, 'description'),
        error: stanza.numberSub(NS, 'error', true),
        floor: stanza.subText(NS, 'floor'),
        latitude: stanza.numberSub(NS, 'lat', true),
        locality: stanza.subText(NS, 'locality'),
        longitude: stanza.numberSub(NS, 'lon', true),
        postalcode: stanza.subText(NS, 'postalcode'),
        region: stanza.subText(NS, 'region'),
        room: stanza.subText(NS, 'room'),
        speed: stanza.numberSub(NS, 'speed', true),
        street: stanza.subText(NS, 'street'),
        text: stanza.subText(NS, 'text'),
        timestamp: stanza.dateSub(NS, 'timestamp'),
        uri: stanza.subText(NS, 'uri')
    }
});

stanza.extend(Item, GeoLoc);
stanza.extend(EventItem, GeoLoc);
