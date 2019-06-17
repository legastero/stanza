// ====================================================================
// XEP-0141: Data Forms Layout
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0141.html
// Version: 1.0 (2005-05-12)
// ====================================================================

import { attribute, DefinitionOptions, text } from '../jxt';

import { NS_DATAFORM_LAYOUT } from '../Namespaces';

declare module './xep0004' {
    export interface DataForm {
        layout?: DataFormLayout[];
    }
}

export interface DataFormLayoutPageSection {
    type: 'page' | 'section';
    label?: string;
    contents?: DataFormLayout[];
}

export interface DataFormLayoutText {
    type: 'text';
    value: string;
}

export interface DataFormLayoutFieldRef {
    type: 'fieldref';
    field: string;
}

export interface DataFormLayoutReportedRef {
    type: 'reportedref';
}

export type DataFormLayout =
    | DataFormLayoutPageSection
    | DataFormLayoutText
    | DataFormLayoutFieldRef
    | DataFormLayoutReportedRef;

export default [
    {
        aliases: [
            {
                multiple: true,
                path: 'dataform.layout'
            }
        ],
        element: 'page',
        fields: {
            label: attribute('label')
        },
        namespace: NS_DATAFORM_LAYOUT
    },
    {
        aliases: [
            'dataformLayout',
            {
                multiple: true,
                path: 'dataformLayout.contents'
            },
            {
                multiple: true,
                path: 'dataform.layout.contents'
            }
        ],
        element: 'section',
        fields: {
            label: attribute('label')
        },
        namespace: NS_DATAFORM_LAYOUT,
        type: 'section',
        typeField: 'type'
    },
    {
        aliases: [
            'dataformLayout',
            {
                multiple: true,
                path: 'dataformLayout.contents'
            },
            {
                multiple: true,
                path: 'dataform.layout.contents'
            }
        ],
        element: 'text',
        fields: {
            value: text()
        },
        namespace: NS_DATAFORM_LAYOUT,
        type: 'text',
        typeField: 'type'
    },
    {
        aliases: [
            'dataformLayout',
            {
                multiple: true,
                path: 'dataformLayout.contents'
            },
            {
                multiple: true,
                path: 'dataform.layout.contents'
            }
        ],
        element: 'fieldref',
        fields: {
            field: attribute('var')
        },
        namespace: NS_DATAFORM_LAYOUT,
        type: 'fieldref',
        typeField: 'type'
    },
    {
        aliases: [
            'dataformLayout',
            {
                multiple: true,
                path: 'dataformLayout.contents'
            },
            {
                multiple: true,
                path: 'dataform.layout.contents'
            }
        ],
        element: 'reportedref',
        namespace: NS_DATAFORM_LAYOUT,
        type: 'reportedref',
        typeField: 'type'
    }
] as DefinitionOptions[];
