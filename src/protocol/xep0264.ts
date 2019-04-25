// ====================================================================
// XEP-0224: Attention
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0224.html
// Version: Version 1.0 (2008-11-13)
// ====================================================================

import { attribute, DefinitionOptions, integerAttribute } from '../jxt';

import { NS_BOB, NS_THUMBS_1 } from './Namespaces';

import { addAlias } from './util';
import { Bits } from './xep0231';

declare module './xep0166' {
    export interface Jingle {
        bits?: Bits[];
    }
}

export interface Thumbnail {
    mediaType: string;
    width?: number;
    height?: number;
    uri: string;
}

export default [
    addAlias(NS_BOB, 'data', [{ path: 'iq.jingle.bits', multiple: true }]),
    {
        element: 'thumbnail',
        fields: {
            height: integerAttribute('height'),
            mediaType: attribute('media-type'),
            uri: attribute('uri'),
            width: integerAttribute('width')
        },
        namespace: NS_THUMBS_1,
        path: 'thumbnail'
    }
] as DefinitionOptions[];
