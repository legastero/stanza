// ====================================================================
// XEP-0184: Message Delivery Receipts
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0184.html
// Version: 1.2 (2011-03-01)
// ====================================================================

import { attribute, DefinitionOptions } from '../../jxt';

import { NS_RECEIPTS } from '../Namespaces';
import './rfc6120';

declare module './rfc6120' {
    export interface Message {
        receipt?: MessageReceipt;
    }
}

export interface MessageReceipt {
    type: 'request' | 'received';
    id?: string;
}

export default [
    {
        defaultType: 'request',
        element: 'request',
        namespace: NS_RECEIPTS,
        path: 'message.receipt',
        type: 'request',
        typeField: 'type'
    },
    {
        element: 'received',
        fields: {
            id: attribute('id')
        },
        namespace: NS_RECEIPTS,
        path: 'message.receipt',
        type: 'received',
        typeField: 'type'
    }
] as DefinitionOptions[];
