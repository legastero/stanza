// ====================================================================
// XEP-0092: Software Version
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0092.html
// Version: 1.1 (2007-02-15)
// ====================================================================

import { childText, DefinitionOptions } from '../../jxt';

import { NS_VERSION } from './namespaces';
import './rfc6120';

declare module './rfc6120' {
    export interface IQ {
        softwareVersion?: SoftwareVersion;
    }
}

export interface SoftwareVersion {
    name?: string;
    version?: string;
    os?: string;
}

export default {
    element: 'query',
    fields: {
        name: childText(null, 'name'),
        os: childText(null, 'os'),
        version: childText(null, 'version')
    },
    namespace: NS_VERSION,
    path: 'iq.software'
} as DefinitionOptions;
