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

declare module './' {
    export interface AtomEntry extends PubsubItemContent {
        itemType?: typeof NS_ATOM;
        authors?: AtomPerson[];
        categories?: AtomCategory[];
        content?: AtomText;
        contributors?: AtomPerson[];
        id?: string;
        links?: AtomLink[];
        published?: Date;
        rights?: AtomText;
        summary?: AtomText;
        title?: AtomText;
        updated?: Date;
    }
}

export interface AtomText {
    text?: string;
    type?: 'text' | 'html';
}

export interface AtomLink {
    href?: string;
    mediaType?: string;
    rel?: string;
}

export interface AtomPerson {
    name?: string;
    uri?: string;
    email?: string;
}

export interface AtomCategory {
    term?: string;
    scheme?: string;
    label?: string;
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
    },
    {
        aliases: [{ path: 'atomentry.authors', multiple: true }],
        element: 'author',
        fields: {
            name: childText(null, 'name'),
            uri: childText(null, 'uri'),
            email: childText(null, 'email')
        },
        namespace: NS_ATOM
    },
    {
        aliases: [{ path: 'atomentry.contributors', multiple: true }],
        element: 'contributor',
        fields: {
            name: childText(null, 'name'),
            uri: childText(null, 'uri'),
            email: childText(null, 'email')
        },
        namespace: NS_ATOM
    },
    {
        aliases: [{ path: 'atomentry.categories', multiple: true }],
        element: 'category',
        fields: {
            term: attribute('term'),
            scheme: attribute('scheme'),
            label: attribute('label')
        },
        namespace: NS_ATOM
    },
    {
        element: 'content',
        fields: {
            text: text(),
            type: attribute('type', 'text')
        },
        namespace: NS_ATOM,
        path: 'atomentry.content'
    },
    {
        element: 'rights',
        fields: {
            text: text(),
            type: attribute('type', 'text')
        },
        namespace: NS_ATOM,
        path: 'atomentry.rights'
    }
];
export default Protocol;
