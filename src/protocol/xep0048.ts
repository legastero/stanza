// ====================================================================
// XEP-0048: Bookmarks
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0048.html
// Version: 1.1 (2007-11-07)
// ====================================================================

import { JID } from '../JID';
import {
    attribute,
    booleanAttribute,
    childText,
    DefinitionOptions,
    JIDAttribute,
    pubsubItemContentAliases
} from '../jxt';
import { NS_BOOKMARKS } from '../Namespaces';

import { PubsubItemContent } from './';

declare module './' {
    export interface PrivateStorage {
        bookmarks?: BookmarkStorage;
    }
}

export interface BookmarkStorage extends PubsubItemContent {
    itemType?: typeof NS_BOOKMARKS;
    rooms?: MUCBookmark[];
}

export interface MUCBookmark {
    jid: JID;
    name?: string;
    nick?: string;
    autoJoin?: boolean;
    password?: string;
}

const Protocol: DefinitionOptions[] = [
    {
        aliases: [
            { path: 'bookmarkStorage', impliedType: true },
            { path: 'iq.privateStorage.bookmarks', impliedType: true },
            ...pubsubItemContentAliases()
        ],
        element: 'storage',
        namespace: NS_BOOKMARKS,
        type: NS_BOOKMARKS,
        typeField: 'itemType'
    },
    {
        aliases: [{ path: 'bookmarkStorage.rooms', multiple: true }],
        element: 'conference',
        fields: {
            autoJoin: booleanAttribute('autojoin'),
            jid: JIDAttribute('jid'),
            name: attribute('name'),
            nick: childText(null, 'nick'),
            password: childText(null, 'password')
        },
        namespace: NS_BOOKMARKS
    }
];
export default Protocol;
