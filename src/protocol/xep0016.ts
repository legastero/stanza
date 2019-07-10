// ====================================================================
// XEP-0016: Privacy Lists
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0016.html
// Version: 1.7 (2007-08-13)
// ====================================================================

import {
    attribute,
    childAttribute,
    childBoolean,
    DefinitionOptions,
    integerAttribute
} from '../jxt';

import { NS_PRIVACY } from '../Namespaces';

declare module './' {
    export interface IQPayload {
        privacy?: PrivacyList;
    }
}

export interface PrivacyList {
    activeList?: string;
    defaultList?: string;
    lists?: Array<{
        name: string;
        items: Array<{
            type?: 'jid' | 'group' | 'subscription';
            value?: string;
            action: 'allow' | 'deny';
            order: number;
            messages?: boolean;
            incomingPresence?: boolean;
            outgoingPresence?: boolean;
            iq?: boolean;
        }>;
    }>;
}

const Protocol: DefinitionOptions[] = [
    {
        element: 'query',
        fields: {
            activeList: childAttribute(null, 'active', 'name'),
            defaultList: childAttribute(null, 'default', 'name')
        },
        namespace: NS_PRIVACY,
        path: 'iq.privacy'
    },
    {
        aliases: [{ path: 'iq.privacy.lists', multiple: true }],
        element: 'list',
        fields: {
            name: attribute('name')
        },
        namespace: NS_PRIVACY
    },
    {
        aliases: [{ path: 'iq.privacy.lists.items', multiple: true }],
        element: 'item',
        fields: {
            action: attribute('action'),
            incomingPresence: childBoolean(null, 'presence-in'),
            iq: childBoolean(null, 'iq'),
            messages: childBoolean(null, 'message'),
            order: integerAttribute('order'),
            outgoingPresence: childBoolean(null, 'presence-out'),
            type: attribute('type'),
            value: attribute('value')
        },
        namespace: NS_PRIVACY
    }
];
export default Protocol;
