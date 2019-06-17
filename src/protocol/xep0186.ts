// ====================================================================
// XEP-0186: Invisible Command
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0186.html
// Version: 0.13 (2017-11-29)
// ====================================================================

import { booleanAttribute, DefinitionOptions } from '../jxt';

import { NS_INVISIBLE_0 } from '../Namespaces';

declare module './' {
    export interface IQ {
        visiblity?: Visibility;
    }
}

export interface Visibility {
    type: 'visible' | 'invisible';
    probe?: boolean;
}

export default [
    {
        element: 'invisible',
        fields: {
            probe: booleanAttribute('probe')
        },
        namespace: NS_INVISIBLE_0,
        path: 'iq.visibility',
        type: 'invisible',
        typeField: 'type'
    },
    {
        element: 'visible',
        namespace: NS_INVISIBLE_0,
        path: 'iq.visibility',
        type: 'visible'
    }
] as DefinitionOptions[];
