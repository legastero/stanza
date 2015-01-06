'use strict';

var NS = 'http://jabber.org/protocol/geoloc';


module.exports = function (stanza) {
    var types = stanza.utils;

    var GeoLoc = stanza.define({
        name: 'geoloc',
        namespace: NS,
        element: 'geoloc',
        fields: {
            accuracy: types.numberSub(NS, 'accuracy', true),
            altitude: types.numberSub(NS, 'alt', true),
            area: types.textSub(NS, 'area'),
            heading: types.numberSub(NS, 'bearing', true),
            bearing: types.numberSub(NS, 'bearing', true),
            building: types.textSub(NS, 'building'),
            country: types.textSub(NS, 'country'),
            countrycode: types.textSub(NS, 'countrycode'),
            datum: types.textSub(NS, 'datum'),
            description: types.textSub(NS, 'description'),
            error: types.numberSub(NS, 'error', true),
            floor: types.textSub(NS, 'floor'),
            latitude: types.numberSub(NS, 'lat', true),
            locality: types.textSub(NS, 'locality'),
            longitude: types.numberSub(NS, 'lon', true),
            postalcode: types.textSub(NS, 'postalcode'),
            region: types.textSub(NS, 'region'),
            room: types.textSub(NS, 'room'),
            speed: types.numberSub(NS, 'speed', true),
            street: types.textSub(NS, 'street'),
            text: types.textSub(NS, 'text'),
            timestamp: types.dateSub(NS, 'timestamp'),
            tzo: types.tzoSub(NS, 'tzo'),
            uri: types.textSub(NS, 'uri')
        }
    });
    
    stanza.withPubsubItem(function (Item) {
        stanza.extend(Item, GeoLoc);
    });
};
