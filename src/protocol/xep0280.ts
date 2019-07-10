// ====================================================================
// XEP-0280: Message Carbons
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0280.html
// Version: 0.12.0 (2017-02-16)
// ====================================================================

import { addAlias, DefinitionOptions } from '../jxt';
import { NS_CARBONS_2, NS_FORWARD_0 } from '../Namespaces';

import { Forward } from './';

declare module './' {
    export interface Message {
        carbon?: CarbonMessage | CarbonPrivate;
    }

    export interface IQPayload {
        carbons?: CarbonControl;
    }
}

export interface CarbonControl {
    action: 'enable' | 'disable';
}

export interface CarbonMessage {
    type: 'sent' | 'received';
    forward: Forward;
}

export interface CarbonPrivate {
    type: 'private';
}

const Protocol: DefinitionOptions[] = [
    addAlias(NS_FORWARD_0, 'forwarded', ['message.carbon.forward']),
    {
        element: 'enable',
        namespace: NS_CARBONS_2,
        path: 'iq.carbons',
        type: 'enable',
        typeField: 'action'
    },
    {
        element: 'disable',
        namespace: NS_CARBONS_2,
        path: 'iq.carbons',
        type: 'disable',
        typeField: 'action'
    },
    {
        element: 'sent',
        namespace: NS_CARBONS_2,
        path: 'message.carbon',
        type: 'sent',
        typeField: 'type'
    },
    {
        element: 'received',
        namespace: NS_CARBONS_2,
        path: 'message.carbon',
        type: 'received',
        typeField: 'type'
    },
    {
        element: 'private',
        namespace: NS_CARBONS_2,
        path: 'message.carbon'
    }
];
export default Protocol;
