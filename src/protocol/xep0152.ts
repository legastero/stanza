// ====================================================================
// XEP-0152: Reachability Addresses
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0152.html
// Version: 1.0 (2014-02-25)
// ====================================================================

import {
    attribute,
    childAlternateLanguageText,
    childText,
    DefinitionOptions,
    LanguageSet,
    splicePath
} from '../jxt';

import { NS_REACH_0 } from '../Namespaces';
import { extendPresence, pubsubItemContentAliases } from './util';

declare module './' {
    export interface Presence {
        reachabilityAddresses?: ReachabilityAddress[];
    }
}

declare module './xep0060' {
    export interface PubsubItemContent {
        reachabilityAddresses?: ReachabilityAddress[];
    }
}

export interface UserReachability {
    itemType?: typeof NS_REACH_0;
    reachabilityAddresses?: ReachabilityAddress[];
}

export interface ReachabilityAddress {
    uri: string;
    description?: string;
    alternateLanguageDescriptions?: LanguageSet<string>;
}

export default [
    extendPresence({
        reachabilityAddresses: splicePath(NS_REACH_0, 'reach', 'reachabilityAddress', true)
    }),
    {
        aliases: ['reachability', ...pubsubItemContentAliases(NS_REACH_0)],
        element: 'reach',
        namespace: NS_REACH_0
    },
    {
        aliases: [
            'reachabilityAddress',
            { path: 'reachability.reachabilityAddresses', multiple: true }
        ],
        element: 'addr',
        fields: {
            alternateLanguageDescriptions: childAlternateLanguageText(null, 'desc'),
            description: childText(null, 'desc'),
            uri: attribute('uri')
        },
        namespace: NS_REACH_0,
        path: 'reachabilityAddress'
    }
] as DefinitionOptions[];
