// ====================================================================
// XEP-0050: Ad-Hoc Commands
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0050.html
// Version: 1.2.2 (2016-12-03)
// ====================================================================

import { attribute, childBoolean, childEnum, DefinitionOptions, text } from '../../jxt';

import { NS_ADHOC_COMMANDS, NS_DATAFORM } from './namespaces';
import './rfc6120';
import { addAlias, extendStanzaError } from './util';
import { DataForm } from './xep0004';

declare module './rfc6120' {
    export interface IQ {
        command?: AdHocCommand;
    }
    export interface StanzaError {
        commandError?:
            | 'bad-action'
            | 'bad-locale'
            | 'bad-payload'
            | 'bad-sessionid'
            | 'malformed-action'
            | 'session-expired';
    }
}

export interface AdHocCommand {
    sid?: string;
    node?: string;
    status?: 'canceled' | 'executing' | 'completed';
    action?: 'execute' | 'cancel' | 'complete' | 'next' | 'prev';
    availableActions?: {
        execute: string;
        next?: boolean;
        prev?: boolean;
        complete?: boolean;
    };
    notes?: Array<{
        type?: 'info' | 'warn' | 'error';
        value?: string;
    }>;
    form?: DataForm;
}

export default [
    addAlias(NS_DATAFORM, 'x', ['iq.command.form']),
    extendStanzaError({
        commandError: childEnum(NS_ADHOC_COMMANDS, [
            'bad-action',
            'bad-locale',
            'bad-payload',
            'bad-sessionid',
            'malformed-action',
            'session-expired'
        ])
    }),
    {
        element: 'command',
        fields: {
            action: attribute('action'),
            node: attribute('node'),
            sid: attribute('sessionid'),
            status: attribute('status')
        },
        namespace: NS_ADHOC_COMMANDS,
        path: 'iq.command'
    },
    {
        element: 'actions',
        fields: {
            complete: childBoolean(null, 'complete'),
            execute: attribute('execute'),
            next: childBoolean(null, 'next'),
            prev: childBoolean(null, 'prev')
        },
        namespace: NS_ADHOC_COMMANDS,
        path: 'iq.command.availableActions'
    },
    {
        aliases: [{ path: 'iq.command.notes', multiple: true }],
        element: 'note',
        fields: {
            type: attribute('type'),
            value: text()
        },
        namespace: NS_ADHOC_COMMANDS
    }
] as DefinitionOptions[];
