// ====================================================================
// XEP-0198: Stream Management
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0198.html
// Version: 1.5.2 (2016-12-08)
// ====================================================================

import {
    attribute,
    booleanAttribute,
    childBoolean,
    DefinitionOptions,
    extendStreamFeatures,
    integerAttribute
} from '../jxt';
import { NS_SMACKS_3 } from '../Namespaces';

declare module './' {
    export interface StreamFeatures {
        streamManagement?: boolean;
    }
}

export interface StreamManagementAck {
    type: 'ack';
    handled: number;
}

export interface StreamManagementRequest {
    type: 'request';
}

export interface StreamManagementEnable {
    type: 'enable';
    allowResumption?: boolean;
}

export interface StreamManagementEnabled {
    type: 'enabled';
    id: string;
    resume?: boolean;
}

export interface StreamManagementResume {
    type: 'resume' | 'resumed';
    handled: number;
    previousSession: string;
}

export interface StreamManagementFailed {
    type: 'failed';
    handled?: number;
}

export type StreamManagement =
    | StreamManagementAck
    | StreamManagementRequest
    | StreamManagementEnable
    | StreamManagementEnabled
    | StreamManagementResume
    | StreamManagementFailed;

const Protocol: DefinitionOptions[] = [
    extendStreamFeatures({
        streamManagement: childBoolean(NS_SMACKS_3, 'sm')
    }),
    {
        element: 'a',
        fields: {
            handled: integerAttribute('h')
        },
        namespace: NS_SMACKS_3,
        path: 'sm',
        type: 'ack',
        typeField: 'type'
    },
    {
        element: 'r',
        namespace: NS_SMACKS_3,
        path: 'sm',
        type: 'request',
        typeField: 'type'
    },
    {
        element: 'enable',
        fields: {
            allowResumption: booleanAttribute('resume')
        },
        namespace: NS_SMACKS_3,
        path: 'sm',
        type: 'enable',
        typeField: 'type'
    },
    {
        element: 'enabled',
        fields: {
            id: attribute('id'),
            resume: booleanAttribute('resume')
        },
        namespace: NS_SMACKS_3,
        path: 'sm',
        type: 'enabled',
        typeField: 'type'
    },
    {
        element: 'resume',
        fields: {
            handled: integerAttribute('h'),
            previousSession: attribute('previd')
        },
        namespace: NS_SMACKS_3,
        path: 'sm',
        type: 'resume',
        typeField: 'type'
    },
    {
        element: 'resumed',
        fields: {
            handled: integerAttribute('h'),
            previousSession: attribute('previd')
        },
        namespace: NS_SMACKS_3,
        path: 'sm',
        type: 'resumed',
        typeField: 'type'
    },
    {
        element: 'failed',
        fields: {
            handled: integerAttribute('h')
        },
        namespace: NS_SMACKS_3,
        path: 'sm',
        type: 'failed',
        typeField: 'type'
    }
];
export default Protocol;
