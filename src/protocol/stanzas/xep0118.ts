// ====================================================================
// XEP-0108: User Tune
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0118.html
// Version: 1.2 (2008-01-30)
// ====================================================================

import { childInteger, childText, DefinitionOptions } from '../../jxt';

import { NS_TUNE } from './namespaces';
import './rfc6120';
import { pubsubItemContentAliases } from './util';
import { PubsubItemContent } from './xep0060';

export interface UserTune extends PubsubItemContent {
    itemType?: typeof NS_TUNE;
    artist?: string;
    length?: number;
    rating?: number;
    source?: string;
    title?: string;
    track?: string;
    uri?: string;
}

export default {
    aliases: [
        {
            impliedType: true,
            path: 'tune'
        },
        ...pubsubItemContentAliases()
    ],
    element: 'tune',
    fields: {
        artist: childText(null, 'artist'),
        length: childInteger(null, 'length'),
        rating: childInteger(null, 'rating'),
        source: childText(null, 'source'),
        title: childText(null, 'title'),
        track: childText(null, 'track'),
        uri: childText(null, 'uri')
    },
    namespace: NS_TUNE,
    type: NS_TUNE
} as DefinitionOptions;
