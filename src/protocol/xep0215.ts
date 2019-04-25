// ====================================================================
// XEP-0215: External Service Discovery
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0215.html
// Version: 0.6 (2014-02-27)
// ====================================================================

import {
    attribute,
    booleanAttribute,
    childAttribute,
    childBooleanAttribute,
    childDateAttribute,
    childIntegerAttribute,
    dateAttribute,
    DefinitionOptions,
    integerAttribute
} from '../jxt';

import { NS_DISCO_EXTERNAL_1 } from './Namespaces';

import { DataForm } from './xep0004';

declare module './' {
    export interface IQ {
        externalServices?: ExternalServiceList;
        externalServiceCredentials?: ExternalServiceCredentials;
    }

    export interface ExternalService {
        action?: 'add' | 'remove' | 'modify';
        expires?: Date;
        host?: string;
        name?: string;
        password?: string;
        port?: number;
        restricted?: boolean;
        transport?: string;
        type?: string;
        username?: string;
        form?: DataForm;
    }

    export interface ExternalServiceList {
        version?: '1' | '2';
        type?: string;
        services?: ExternalService[];
    }

    export interface ExternalServiceCredentials extends ExternalService {
        version?: '1' | '2';
    }
}

export default [
    {
        aliases: ['iq.externalServiceCredentials'],
        defaultType: '1',
        element: 'credentials',
        fields: {
            expires: childDateAttribute(null, 'service', 'expires'),
            host: childAttribute(null, 'service', 'host'),
            name: childAttribute(null, 'service', 'name'),
            password: childAttribute(null, 'service', 'password'),
            port: childIntegerAttribute(null, 'service', 'port'),
            restricuted: childBooleanAttribute(null, 'service', 'restricted'),
            transport: childAttribute(null, 'service', 'transport'),
            type: childAttribute(null, 'service', 'type'),
            username: childAttribute(null, 'service', 'username')
        },
        namespace: NS_DISCO_EXTERNAL_1,
        type: '1',
        typeField: 'version'
    },
    {
        aliases: ['iq.externalServices'],
        defaultType: '1',
        element: 'services',
        fields: {
            type: attribute('type')
        },
        namespace: NS_DISCO_EXTERNAL_1,
        type: '1',
        typeField: 'version'
    },
    {
        aliases: [{ path: 'iq.externalServices.services', multiple: true }],
        defaultType: '1',
        element: 'service',
        fields: {
            expires: dateAttribute('expires'),
            host: attribute('host'),
            name: attribute('name'),
            password: attribute('password'),
            port: integerAttribute('port'),
            restricuted: booleanAttribute('restricted'),
            transport: attribute('transport'),
            type: attribute('type'),
            username: attribute('username')
        },
        namespace: NS_DISCO_EXTERNAL_1,
        type: '1',
        typeField: 'version'
    }
] as DefinitionOptions[];
