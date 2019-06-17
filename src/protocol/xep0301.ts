// ====================================================================
// XEP-0301: In-Band Real Time Text
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0301.html
// Version: 1.0 (2013-10-082)
// ====================================================================

import { attribute, DefinitionOptions, integerAttribute, text } from '../jxt';

import { NS_RTT_0 } from '../Namespaces';

declare module './' {
    export interface Message {
        rtt?: RTT;
    }
}

export interface RTT {
    id?: string;
    event?: 'new' | 'reset' | 'edit' | 'init' | 'cancel';
    seq?: number;
    actions?: RTTAction[];
}

export interface RTTInsert {
    type: 'insert';
    position?: number;
    text?: string;
    baseTime?: number;
}

export interface RTTErase {
    type: 'erase';
    position?: number;
    length?: number;
    baseTime?: number;
}

export interface RTTWait {
    type: 'wait';
    duration: number;
    baseTime?: number;
}

export type RTTAction = RTTInsert | RTTErase | RTTWait;

export default [
    {
        element: 'rtt',
        fields: {
            event: attribute('event', 'edit'),
            id: attribute('id'),
            seq: integerAttribute('seq')
        },
        namespace: NS_RTT_0,
        path: 'message.rtt'
    },
    {
        aliases: [{ path: 'message.rtt.actions', multiple: true }],
        element: 't',
        fields: {
            position: integerAttribute('p'),
            text: text()
        },
        namespace: NS_RTT_0,
        type: 'insert',
        typeField: 'type'
    },
    {
        aliases: [{ path: 'message.rtt.actions', multiple: true }],
        element: 'e',
        fields: {
            length: integerAttribute('n', 1),
            position: integerAttribute('p')
        },
        namespace: NS_RTT_0,
        type: 'erase',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path: 'message.rtt.actions' }],
        element: 'w',
        fields: {
            duration: integerAttribute('n', 0)
        },
        namespace: NS_RTT_0,
        type: 'wait',
        typeField: 'type'
    }
] as DefinitionOptions[];
