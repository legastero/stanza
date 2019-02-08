// ====================================================================
// XEP-0115: Entity Capabilities
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0115.html
// Version: 1.5.1 (2016-10-06)
// ====================================================================

import { attribute, DefinitionOptions, staticValue } from '../../jxt';

import { NS_DISCO_LEGACY_CAPS } from './namespaces';
import './rfc6120';

declare module './rfc6120' {
    export interface StreamFeatures {
        legacyCapabilities?: LegacyEntityCaps[];
    }

    export interface Presence {
        legacyCapabilities?: LegacyEntityCaps[];
    }
}

export interface LegacyEntityCaps {
    node: string;
    value: string;
    algorithm: string;
}

export default {
    aliases: ['presence.legacyCapabilities', 'features.legacyCapabilities'],
    element: 'c',
    fields: {
        algorithm: attribute('hash'),
        legacy: staticValue(true),
        node: attribute('node'),
        value: attribute('ver')
    },
    namespace: NS_DISCO_LEGACY_CAPS
} as DefinitionOptions;
