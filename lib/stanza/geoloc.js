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
            area: types.subText(NS, 'area'),
            heading: types.numberSub(NS, 'bearing', true),
            bearing: types.numberSub(NS, 'bearing', true),
            building: types.subText(NS, 'building'),
            country: types.subText(NS, 'country'),
            countrycode: types.subText(NS, 'countrycode'),
            datum: types.subText(NS, 'datum'),
            description: types.subText(NS, 'description'),
            error: types.numberSub(NS, 'error', true),
            floor: types.subText(NS, 'floor'),
            latitude: types.numberSub(NS, 'lat', true),
            locality: types.subText(NS, 'locality'),
            longitude: types.numberSub(NS, 'lon', true),
            postalcode: types.subText(NS, 'postalcode'),
            region: types.subText(NS, 'region'),
            room: types.subText(NS, 'room'),
            speed: types.numberSub(NS, 'speed', true),
            street: types.subText(NS, 'street'),
            text: types.subText(NS, 'text'),
            timestamp: types.dateSub(NS, 'timestamp'),
            tzo: types.tzoSub(NS, 'tzo'),
            uri: types.subText(NS, 'uri')
        }
    });
    
    stanza.withPubsubItem(function (Item) {
        stanza.extend(Item, GeoLoc);
    });
};
