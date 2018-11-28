import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const GeoLoc = JXT.define({
        element: 'geoloc',
        fields: {
            accuracy: Utils.numberSub(NS.GEOLOC, 'accuracy', true),
            altitude: Utils.numberSub(NS.GEOLOC, 'alt', true),
            area: Utils.textSub(NS.GEOLOC, 'area'),
            bearing: Utils.numberSub(NS.GEOLOC, 'bearing', true),
            building: Utils.textSub(NS.GEOLOC, 'building'),
            country: Utils.textSub(NS.GEOLOC, 'country'),
            countrycode: Utils.textSub(NS.GEOLOC, 'countrycode'),
            datum: Utils.textSub(NS.GEOLOC, 'datum'),
            description: Utils.textSub(NS.GEOLOC, 'description'),
            error: Utils.numberSub(NS.GEOLOC, 'error', true),
            floor: Utils.textSub(NS.GEOLOC, 'floor'),
            heading: Utils.numberSub(NS.GEOLOC, 'bearing', true),
            latitude: Utils.numberSub(NS.GEOLOC, 'lat', true),
            locality: Utils.textSub(NS.GEOLOC, 'locality'),
            longitude: Utils.numberSub(NS.GEOLOC, 'lon', true),
            postalcode: Utils.textSub(NS.GEOLOC, 'postalcode'),
            region: Utils.textSub(NS.GEOLOC, 'region'),
            room: Utils.textSub(NS.GEOLOC, 'room'),
            speed: Utils.numberSub(NS.GEOLOC, 'speed', true),
            street: Utils.textSub(NS.GEOLOC, 'street'),
            text: Utils.textSub(NS.GEOLOC, 'text'),
            timestamp: Utils.dateSub(NS.GEOLOC, 'timestamp'),
            tzo: Utils.tzoSub(NS.GEOLOC, 'tzo'),
            uri: Utils.textSub(NS.GEOLOC, 'uri')
        },
        name: 'geoloc',
        namespace: NS.GEOLOC
    });

    JXT.extendPubsubItem(GeoLoc);
}
