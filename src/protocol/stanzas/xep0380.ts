// ====================================================================
// XEP-0380: Explicit Message Encryption
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0380.html
// Version: 0.2.0 (2018-01-25)
// ====================================================================

import { attribute, DefinitionOptions } from '../../jxt';

import { NS_EME_0 } from './namespaces';
import './rfc6120';

declare module './rfc6120' {
    export interface Message {
        encryptionMethod?: EncryptionMethod;
    }
}

export interface EncryptionMethod {
    name?: string;
    namespace: string;
}

export default [
    {
        element: 'encryption',
        fields: {
            name: attribute('name'),
            namespace: attribute('namespace')
        },
        namespace: NS_EME_0,
        path: 'message.encryptionMethod'
    }
] as DefinitionOptions[];
