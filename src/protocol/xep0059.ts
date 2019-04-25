// ====================================================================
// XEP-0059: Result Set Management
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0059.html
// Version: 1.0.0 (2006-09-20)
// ====================================================================

import {
    attribute,
    childInteger,
    childIntegerAttribute,
    childText,
    DefinitionOptions,
    integerAttribute
} from '../jxt';

import { NS_RSM } from './Namespaces';

export interface Paging {
    max?: number;
    before?: string;
    after?: string;
    first?: string;
    last?: string;
    count?: number;
    index?: number;
    firstIndex?: number;
}

export default {
    aliases: ['iq.pubsub.paging'],
    element: 'set',
    fields: {
        after: attribute('after'),
        before: attribute('before'),
        count: childInteger(null, 'count'),
        first: childText(null, 'first'),
        firstIndex: childIntegerAttribute(null, 'first', 'index'),
        index: childInteger(null, 'index'),
        last: childText(null, 'last'),
        max: integerAttribute('max')
    },
    namespace: NS_RSM,
    path: 'paging'
} as DefinitionOptions;
