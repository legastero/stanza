// ====================================================================
// XEP-0313: Message Archive Management
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0313.html
// Version: 0.6.1 (2017-02-22)
// ====================================================================

import { JID } from '../JID';
import {
    addAlias,
    attribute,
    booleanAttribute,
    DefinitionOptions,
    deepMultipleChildText
} from '../jxt';
import { NS_DATAFORM, NS_FORWARD_0, NS_MAM_2, NS_MAM_1, NS_RSM } from '../Namespaces';

import { DataForm, Forward, Paging } from './';

declare module './' {
    export interface Message {
        archive?: MAMResult;
    }

    export interface IQPayload {
        archive?: MAMQuery | MAMFin | MAMPrefs;
    }
}

export interface MAMQuery {
    type?: 'query';
    version?: string;
    node?: string;
    form?: DataForm;
    queryId?: string;
    paging?: Paging;
}

export interface MAMFin {
    type: 'result';
    version?: string;
    complete?: boolean;
    stable?: boolean;
    results?: MAMResult[];
    paging?: Paging;
}

export interface MAMPrefs {
    type: 'preferences';
    version?: string;
    default?: 'always' | 'never' | 'roster';
    always?: JID[];
    never?: JID[];
}

export interface MAMResult {
    version?: string;
    queryId: string;
    id: string;
    item: Forward;
}

const versions = {
    '2': NS_MAM_2,
    '1': NS_MAM_1
};

const Protocol: DefinitionOptions[] = [
    addAlias(NS_DATAFORM, 'x', ['iq.archive.form']),
    addAlias(NS_FORWARD_0, 'forwarded', ['message.archive.item']),
    addAlias(NS_RSM, 'set', ['iq.archive.paging'])
];
for (const [version, namespace] of Object.entries(versions)) {
    Protocol.push(
        {
            defaultType: 'query',
            defaultVersion: '2',
            element: 'query',
            fields: {
                node: attribute('node'),
                queryId: attribute('queryid')
            },
            namespace,
            path: 'iq.archive',
            type: 'query',
            typeField: 'type',
            version,
            versionField: 'version'
        },
        {
            element: 'fin',
            fields: {
                complete: booleanAttribute('complete'),
                stable: booleanAttribute('stable')
            },
            namespace,
            path: 'iq.archive',
            type: 'result',
            version
        },
        {
            element: 'prefs',
            fields: {
                default: attribute('default'),
                always: deepMultipleChildText([
                    { namespace: null, element: 'always' },
                    { namespace: null, element: 'jid' }
                ]),
                never: deepMultipleChildText([
                    { namespace: null, element: 'never' },
                    { namespace: null, element: 'jid' }
                ])
            },
            namespace,
            path: 'iq.archive',
            type: 'preferences',
            version
        },
        {
            element: 'result',
            defaultType: '2',
            fields: {
                id: attribute('id'),
                queryId: attribute('queryid')
            },
            namespace,
            path: 'message.archive',
            type: version,
            typeField: 'version'
        }
    );
}
export default Protocol;
