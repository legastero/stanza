// ====================================================================
// XEP-0280: Message Carbons
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0280.html
// Version: 0.12.0 (2017-02-16)
// ====================================================================

import { DefinitionOptions } from '../../jxt';

import { NS_CARBONS_2, NS_FORWARD_0 } from '../Namespaces';
import './rfc6120';
import { addAlias } from './util';
import { Forward } from './xep0297';

declare module './rfc6120' {
    export interface Message {
        carbon?: CarbonMessage | CarbonPrivate;
    }

    export interface IQ {
        carbons?: CarbonControl;
    }
}

export interface CarbonControl {
    type: 'enable' | 'disable';
}

export interface CarbonMessage {
    type: 'sent' | 'received';
    forward: Forward;
}

export interface CarbonPrivate {
    type: 'private';
}

export default [
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
] as DefinitionOptions[];
