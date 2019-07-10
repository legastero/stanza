// ====================================================================
// XEP-0080: User Location
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0080.html
// Version: 1.9 (2015-12-01)
//
// Additional:
// --------------------------------------------------------------------
// XEP-0350: Data Forms Geolocation Element
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0350.html
// Version: 0.2 (2017-09-11)
// ====================================================================

import {
    childDate,
    childFloat,
    childText,
    childTimezoneOffset,
    DefinitionOptions,
    languageAttribute,
    pubsubItemContentAliases
} from '../jxt';
import { NS_GEOLOC } from '../Namespaces';

import { PubsubItemContent } from './';

export interface Geolocation extends PubsubItemContent {
    itemType?: typeof NS_GEOLOC;
    lang?: string;
    accuracy?: number;
    altitude?: number;
    altitudeAccuracy?: number;
    area?: string;
    heading?: number;
    building?: string;
    country?: string;
    countryCode?: string;
    datum?: string;
    description?: string;
    error?: number;
    floor?: string;
    latitude?: number;
    locality?: string;
    longitude?: number;
    postalCode?: string;
    region?: string;
    room?: string;
    speed?: number;
    street?: string;
    text?: string;
    timestamp?: Date;
    tzo?: number;
    uri?: string;
}

const Protocol: DefinitionOptions = {
    aliases: [
        { path: 'message.geoloc', impliedType: true },
        { path: 'dataform.fields.geoloc', impliedType: true }, // XEP-0350
        ...pubsubItemContentAliases()
    ],
    element: 'geoloc',
    fields: {
        accuracy: childFloat(null, 'accuracy'),
        altitude: childFloat(null, 'alt'),
        altitudeAccuracy: childFloat(null, 'altaccuracy'),
        area: childText(null, 'area'),
        building: childText(null, 'building'),
        country: childText(null, 'country'),
        countryCode: childText(null, 'countrycode'),
        datum: childText(null, 'datum'),
        description: childText(null, 'description'),
        error: childFloat(null, 'error'),
        floor: childText(null, 'floor'),
        heading: childFloat(null, 'bearing'),
        lang: languageAttribute(),
        latitude: childFloat(null, 'lat'),
        locality: childText(null, 'locality'),
        longitude: childFloat(null, 'lon'),
        postalCode: childText(null, 'postalcode'),
        region: childText(null, 'region'),
        room: childText(null, 'room'),
        speed: childFloat(null, 'speed'),
        street: childText(null, 'street'),
        text: childText(null, 'text'),
        timestamp: childDate(null, 'timestamp'),
        tzo: childTimezoneOffset(null, 'tzo'),
        uri: childText(null, 'uri')
    },
    namespace: NS_GEOLOC,
    type: NS_GEOLOC
};
export default Protocol;
