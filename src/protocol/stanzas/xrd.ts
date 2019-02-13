// ====================================================================
// Extensible Resource Descriptor (XRD)
// --------------------------------------------------------------------
// Source: http://docs.oasis-open.org/xri/xrd/v1.0/xrd-1.0.html
// Version: 1.0
// ====================================================================

import { attribute, childText, DefinitionOptions } from '../../jxt';

import { NS_XRD } from '../Namespaces';

export interface XRD {
    subject?: string;
    links?: XRDLink[];
}

export interface XRDLink {
    href?: string;
    rel?: string;
    type?: string;
}

export default [
    {
        element: 'XRD',
        fields: {
            subject: childText(null, 'Subject')
        },
        namespace: NS_XRD,
        path: 'xrd'
    },
    {
        aliases: [{ path: 'xrd.links', multiple: true }],
        element: 'Link',
        fields: {
            href: attribute('href'),
            rel: attribute('rel'),
            type: attribute('type')
        },
        namespace: NS_XRD
    }
] as DefinitionOptions[];
