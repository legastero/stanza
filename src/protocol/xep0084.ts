// ====================================================================
// XEP-0084: User Avatar
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0084.html
// Version: 1.1.1 (2016-07-09)
// ====================================================================

import { attribute, DefinitionOptions, integerAttribute, textBuffer } from '../jxt';
import { NS_AVATAR_DATA, NS_AVATAR_METADATA } from '../Namespaces';

import { PubsubItemContent } from './';
import { pubsubItemContentAliases } from './util';

export interface AvatarData extends PubsubItemContent {
    itemType?: typeof NS_AVATAR_DATA;
    data?: Buffer;
}

export interface AvatarMetaData extends PubsubItemContent {
    itemType?: typeof NS_AVATAR_METADATA;
    versions?: AvatarVersion[];
    pointers?: AvatarPointer[];
}

export interface AvatarVersion {
    bytes?: number;
    height?: number;
    width?: number;
    id: string;
    mediaType?: string;
    uri?: string;
}

export interface AvatarPointer {
    bytes?: number;
    height?: number;
    width?: number;
    id: string;
    mediaType?: string;
}

export default [
    {
        aliases: pubsubItemContentAliases(),
        element: 'data',
        fields: {
            data: textBuffer('base64')
        },
        namespace: NS_AVATAR_DATA,
        path: 'avatar',
        type: NS_AVATAR_DATA,
        typeField: 'itemType'
    },
    {
        aliases: pubsubItemContentAliases(),
        element: 'data',
        namespace: NS_AVATAR_METADATA,
        path: 'avatar',
        type: NS_AVATAR_METADATA,
        typeField: 'itemType'
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'avatar.versions',
                selector: 'metadata'
            }
        ],
        element: 'info',
        fields: {
            bytes: integerAttribute('bytes'),
            height: integerAttribute('height'),
            id: attribute('id'),
            mediaType: attribute('type'),
            uri: attribute('url'),
            width: integerAttribute('width')
        },
        namespace: NS_AVATAR_METADATA
    },
    {
        aliases: [
            {
                multiple: true,
                path: 'avatar.pointers',
                selector: 'metadata'
            }
        ],
        element: 'pointer',
        fields: {
            bytes: integerAttribute('bytes'),
            height: integerAttribute('height'),
            id: attribute('id'),
            mediaType: attribute('type'),
            uri: attribute('url'),
            width: integerAttribute('width')
        },
        namespace: NS_AVATAR_METADATA
    }
] as DefinitionOptions[];
