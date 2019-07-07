// ====================================================================
// XEP-0030: Service Discovery
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0030.html
// Version: 2.5rc3 (2017-10-03)
//
// Additional:
// --------------------------------------------------------------------
// XEP-0128: Service Discovery Extensions
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0128.html
// Version: 1.0 (2004-10-20)
// ====================================================================

import { JID } from '../JID';
import {
    addAlias,
    attribute,
    DefinitionOptions,
    JIDAttribute,
    languageAttribute,
    multipleChildAttribute
} from '../jxt';
import { NS_DATAFORM, NS_DISCO_INFO, NS_DISCO_ITEMS, NS_RSM } from '../Namespaces';

import { DataForm } from './';

declare module './' {
    export interface IQPayload {
        disco?: Disco;
    }

    export interface Message {
        disco?: Disco;
    }

    export interface StreamFeatures {
        disco?: DiscoInfo;
    }
}

export interface DiscoInfoIdentity {
    type: string;
    category: string;
    name?: string;
    lang?: string;
}

export interface DiscoInfo {
    type: 'info';
    node?: string;
    features?: string[];
    identities?: DiscoInfoIdentity[];

    // XEP-0128
    extensions?: DataForm[];
}

export interface DiscoInfoResult extends DiscoInfo {
    features: string[];
    identities: DiscoInfoIdentity[];

    // XEP-0128
    extensions: DataForm[];
}

export interface DiscoItems {
    type: 'items';
    node?: string;
    items?: DiscoItem[];
}

export interface DiscoItemsResult extends DiscoItems {
    items: DiscoItem[];
}

export interface DiscoItem {
    node?: string;
    jid?: JID;
    name?: string;
    lang?: string;
}

export type Disco = DiscoInfo | DiscoItems;

export default [
    {
        aliases: ['iq.disco', 'message.disco', 'features.disco'],
        element: 'query',
        fields: {
            features: multipleChildAttribute(null, 'feature', 'var'),
            node: attribute('node')
        },
        namespace: NS_DISCO_INFO,
        path: 'disco',
        type: 'info',
        typeField: 'type'
    },
    {
        aliases: [{ path: 'disco.identities', selector: 'info', multiple: true }],
        element: 'identity',
        fields: {
            category: attribute('category'),
            lang: languageAttribute(),
            name: attribute('name'),
            type: attribute('type')
        },
        namespace: NS_DISCO_INFO
    },
    {
        aliases: [{ path: 'disco.items', multiple: true, selector: 'items' }],
        element: 'item',
        fields: {
            jid: JIDAttribute('jid'),
            name: attribute('name'),
            node: attribute('node')
        },
        namespace: NS_DISCO_ITEMS
    },
    {
        aliases: [{ path: 'disco.items', multiple: true, selector: 'info' }],
        element: 'item',
        fields: {
            category: JIDAttribute('category'),
            lang: languageAttribute(),
            name: attribute('name'),
            type: attribute('type')
        },
        namespace: NS_DISCO_INFO
    },
    addAlias(NS_DATAFORM, 'x', [
        // XEP-0128
        { path: 'disco.extensions', multiple: true, selector: 'info' }
    ]),
    addAlias(NS_RSM, 'set', [{ path: 'disco.paging', selector: 'items' }]),
    {
        aliases: ['iq.disco', 'message.disco', 'features.disco'],
        element: 'query',
        fields: {
            node: attribute('node')
        },
        namespace: NS_DISCO_ITEMS,
        path: 'disco',
        type: 'items',
        typeField: 'type'
    }
] as DefinitionOptions[];
