// ====================================================================
// XEP-0335: JSON Containers
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0335.html
// Version: 0.1 (2013-10-25)
// ====================================================================

import {
    childJSON,
    DefinitionOptions,
    extendMessage,
    pubsubItemContentAliases,
    textJSON
} from '../jxt';
import { NS_JSON_0 } from '../Namespaces';

import { PubsubItemContent } from './';

declare module './' {
    export interface Message {
        json?: any;
    }
}

export interface JSONItem extends PubsubItemContent {
    itemType: typeof NS_JSON_0;
    json?: any;
}

const Protocol: DefinitionOptions[] = [
    extendMessage({
        json: childJSON(NS_JSON_0, 'json')
    }),
    {
        aliases: pubsubItemContentAliases(),
        element: 'json',
        fields: {
            json: textJSON()
        },
        namespace: NS_JSON_0,
        type: NS_JSON_0
    }
];
export default Protocol;
