// ====================================================================
// XEP-0221: Data Forms Media Element
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0221.html
// Version: 1.0 (2008-09-03)
// ====================================================================

import { attribute, DefinitionOptions, integerAttribute, text } from '../jxt';

import { NS_DATAFORM_MEDIA } from '../Namespaces';

declare module './xep0004' {
    export interface DataFormFieldBase {
        media?: DataFormMedia;
    }
}

export interface DataFormMedia {
    height: number;
    width: number;
    sources: Array<{
        uri: string;
        mediaType: string;
    }>;
}

const Protocol: DefinitionOptions[] = [
    {
        element: 'media',
        fields: {
            height: integerAttribute('height'),
            width: integerAttribute('width')
        },
        namespace: NS_DATAFORM_MEDIA,
        path: 'dataform.fields.media'
    },
    {
        aliases: [{ multiple: true, path: 'dataform.fields.media.sources' }],
        element: 'uri',
        fields: {
            mediaType: attribute('type'),
            uri: text()
        },
        namespace: NS_DATAFORM_MEDIA
    }
];
export default Protocol;
