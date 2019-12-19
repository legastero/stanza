// ====================================================================
// RFC 4287: The Atom Syndication Format
// --------------------------------------------------------------------
// Source: https://tools.ietf.org/html/rfc4287
// ====================================================================

import {
    attribute,
    childDate,
    childText,
    DefinitionOptions,
    pubsubItemContentAliases,
    text
} from '../jxt';
import { NS_ATOM } from '../Namespaces';

import { PubsubItemContent } from './';

export interface AtomEntry extends PubsubItemContent {
    itemType?: typeof NS_ATOM;
    title?: string;
    summary?: AtomSummary;
    id?: string;
    published?: Date;
    updated?: Date;
    links?: AtomLink[];
}

export interface AtomTitle {
    text?: string;
    type?: 'text';
}

export interface AtomSummary {
    text?: string;
    type?: 'text';
}

export interface AtomLink {
    href?: string;
    mediaType?: string;
    rel?: string;
}

const Protocol: DefinitionOptions[] = [
    {
        aliases: ['atomentry', ...pubsubItemContentAliases()],
        element: 'entry',
        fields: {
            id: childText(null, 'id'),
            published: childDate(null, 'published'),
            updated: childDate(null, 'updated')
        },
        namespace: NS_ATOM,
        type: NS_ATOM,
        typeField: 'itemType'
    },
    {
        element: 'summary',
        fields: {
            text: text(),
            type: attribute('type', 'text')
        },
        namespace: NS_ATOM,
        path: 'atomentry.summary'
    },
    {
        element: 'title',
        fields: {
            text: text(),
            type: attribute('type', 'text')
        },
        namespace: NS_ATOM,
        path: 'atomentry.title'
    },
    {
        aliases: [{ path: 'atomentry.links', multiple: true }],
        element: 'link',
        fields: {
            href: attribute('href'),
            mediaType: attribute('type'),
            rel: attribute('rel')
        },
        namespace: NS_ATOM
    }
];
export default Protocol;
