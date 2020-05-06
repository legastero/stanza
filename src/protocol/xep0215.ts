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
import { NS_DISCO_EXTERNAL_1, NS_DISCO_EXTERNAL_2 } from '../Namespaces';

import { DataForm } from './';

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

declare module './' {
    export interface IQPayload {
        externalServices?: ExternalServiceList;
        externalServiceCredentials?: ExternalServiceCredentials;
    }
}

const Protocol: DefinitionOptions[] = [];
for (const version of ['2', '1']) {
    Protocol.push(
        {
            aliases: ['iq.externalServiceCredentials'],
            defaultType: '2',
            element: 'credentials',
            fields: {
                expires: childDateAttribute(null, 'service', 'expires'),
                host: childAttribute(null, 'service', 'host'),
                name: childAttribute(null, 'service', 'name'),
                password: childAttribute(null, 'service', 'password'),
                port: childIntegerAttribute(null, 'service', 'port'),
                restricted: childBooleanAttribute(null, 'service', 'restricted'),
                transport: childAttribute(null, 'service', 'transport'),
                type: childAttribute(null, 'service', 'type'),
                username: childAttribute(null, 'service', 'username')
            },
            namespace: version === '2' ? NS_DISCO_EXTERNAL_2 : NS_DISCO_EXTERNAL_1,
            type: version,
            typeField: 'version'
        },
        {
            aliases: ['iq.externalServices'],
            defaultType: '2',
            element: 'services',
            fields: {
                type: attribute('type')
            },
            namespace: version === '2' ? NS_DISCO_EXTERNAL_2 : NS_DISCO_EXTERNAL_1,
            type: version,
            typeField: 'version'
        },
        {
            aliases: [{ path: 'iq.externalServices.services', multiple: true }],
            defaultType: '2',
            element: 'service',
            fields: {
                expires: dateAttribute('expires'),
                host: attribute('host'),
                name: attribute('name'),
                password: attribute('password'),
                port: integerAttribute('port'),
                restricted: booleanAttribute('restricted'),
                transport: attribute('transport'),
                type: attribute('type'),
                username: attribute('username')
            },
            namespace: version === '2' ? NS_DISCO_EXTERNAL_2 : NS_DISCO_EXTERNAL_1,
            type: version,
            typeField: 'version'
        }
    );
}

export default Protocol;
