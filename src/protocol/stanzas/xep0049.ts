// ====================================================================
// XEP-0049: Private XML Storage
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0049.html
// Version: 1.2 (2004-03-01)
// ====================================================================

import { DefinitionOptions } from '../../jxt';

import { NS_PRIVATE } from '../Namespaces';
import './rfc6120';

declare module './rfc6120' {
    export interface IQ {
        privateStorage?: PrivateStorage;
    }
}

// tslint:disable
export interface PrivateStorage {}
// tslint:enable

export default {
    element: 'query',
    namespace: NS_PRIVATE,
    path: 'iq.privateStorage'
} as DefinitionOptions;
