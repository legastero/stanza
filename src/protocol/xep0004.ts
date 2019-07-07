// ====================================================================
// XEP-0004: Data Forms
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0004.html
// Version: 2.9 (2007-08-13)
// ====================================================================

import { DataFormFieldType, DataFormType } from '../Constants';
import { JID } from '../JID';
import {
    attribute,
    childBoolean,
    childText,
    DefinitionOptions,
    multipleChildText,
    splicePath,
    TranslationContext,
    XMLElement
} from '../jxt';
import { NS_DATAFORM } from '../Namespaces';

declare module './' {
    export interface Message {
        forms?: DataForm[];
    }
}

export interface DataForm {
    type?: DataFormType;
    title?: string;
    instructions?: string | string[];
    reported?: DataFormField[];
    items?: DataFormItem[];
    fields?: DataFormField[];
}

export interface DataFormItem {
    fields: DataFormField[];
}

type DataFormFieldValueType = boolean | string | string[] | JID | JID[];

export interface DataFormFieldBase {
    type?: DataFormFieldType;
    name?: string;
    label?: string;
    description?: string;
    required?: boolean;
    rawValues?: string[];
}

export interface DataFormFieldBoolean extends DataFormFieldBase {
    type: 'boolean';
    value?: boolean;
}

export interface DataFormFieldText extends DataFormFieldBase {
    type:
        | typeof DataFormFieldType.Fixed
        | typeof DataFormFieldType.Hidden
        | typeof DataFormFieldType.TextPrivate
        | typeof DataFormFieldType.Text;
    value?: string;
}

export interface DataFormFieldTextMulti extends DataFormFieldBase {
    type: typeof DataFormFieldType.TextMultiple;
    value?: string[];
}

export interface DataFormFieldList extends DataFormFieldBase {
    type: typeof DataFormFieldType.List;
    value?: string;
    options?: Array<DataFormFieldOption<string>>;
}

export interface DataFormFieldListMulti extends DataFormFieldBase {
    type: typeof DataFormFieldType.ListMultiple;
    value?: string[];
    options?: Array<DataFormFieldOption<string>>;
}

export interface DataFormFieldJID extends DataFormFieldBase {
    type: typeof DataFormFieldType.JID;
    value?: JID;
    options?: Array<DataFormFieldOption<JID>>;
}

export interface DataFormFieldJIDMulti extends DataFormFieldBase {
    type: typeof DataFormFieldType.JIDMultiple;
    value?: JID[];
    options?: Array<DataFormFieldOption<JID>>;
}

export interface DataFormFieldAny extends DataFormFieldBase {
    type?: undefined;
    value?: DataFormFieldValueType;
}

export interface DataFormFieldOption<T> {
    label?: string;
    value: T;
}

export type DataFormField =
    | DataFormFieldBoolean
    | DataFormFieldText
    | DataFormFieldTextMulti
    | DataFormFieldList
    | DataFormFieldListMulti
    | DataFormFieldJID
    | DataFormFieldJIDMulti
    | DataFormFieldAny;

export default [
    {
        aliases: [{ path: 'message.forms', multiple: true }],
        element: 'x',
        fields: {
            instructions: {
                ...multipleChildText(null, 'instructions'),
                exportOrder: 2
            },
            reported: {
                ...splicePath(null, 'reported', 'dataformField', true),
                exportOrder: 3
            },
            title: {
                ...childText(null, 'title'),
                exportOrder: 1
            },
            type: attribute('type')
        },
        namespace: NS_DATAFORM,
        path: 'dataform'
    },
    {
        aliases: [
            { path: 'dataform.fields', multiple: true },
            { path: 'dataform.items.fields', multiple: true }
        ],
        element: 'field',
        fields: {
            description: childText(null, 'desc'),
            label: attribute('label'),
            name: attribute('var'),
            rawValues: {
                ...multipleChildText(null, 'value'),
                exporter: () => null
            },
            required: childBoolean(null, 'required'),
            type: attribute('type'),
            value: {
                importer(
                    xml: XMLElement,
                    context: TranslationContext
                ): DataFormFieldValueType | undefined {
                    const fieldType = xml.getAttribute('type') as DataFormFieldType;
                    const converter = multipleChildText(NS_DATAFORM, 'value');
                    const rawValues: string[] = converter.importer(xml, context) || [];
                    const singleValue = rawValues[0];

                    switch (fieldType) {
                        case DataFormFieldType.TextMultiple:
                        case DataFormFieldType.ListMultiple:
                        case DataFormFieldType.JIDMultiple:
                            return rawValues;
                        case DataFormFieldType.Hidden:
                        case DataFormFieldType.Fixed:
                            if (rawValues.length === 1) {
                                return singleValue;
                            }
                            return rawValues;
                        case DataFormFieldType.JID:
                            if (singleValue) {
                                return singleValue;
                            }
                            break;
                        case DataFormFieldType.Boolean:
                            if (singleValue) {
                                return singleValue === '1' || singleValue === 'true';
                            }
                            break;
                        default:
                            return singleValue;
                    }
                },
                exporter(
                    xml: XMLElement,
                    data: DataFormFieldValueType,
                    context: TranslationContext
                ) {
                    const converter = multipleChildText(null, 'value');
                    let outputData: string[] = [];

                    if (typeof data === 'boolean') {
                        outputData = [data ? '1' : '0'];
                    } else if (!Array.isArray(data)) {
                        outputData = [data.toString()];
                    } else {
                        for (const value of data) {
                            outputData.push(value.toString());
                        }
                    }

                    converter.exporter(
                        xml,
                        outputData,
                        Object.assign({}, context, {
                            namespace: NS_DATAFORM
                        })
                    );
                }
            }
        },
        namespace: NS_DATAFORM,
        path: 'dataformField'
    },
    {
        aliases: [{ path: 'dataform.fields.options', multiple: true }],
        element: 'option',
        fields: {
            label: attribute('label'),
            value: childText(null, 'value')
        },
        namespace: NS_DATAFORM
    },
    {
        aliases: [{ path: 'dataform.items', multiple: true }],
        element: 'item',
        namespace: NS_DATAFORM
    }
] as DefinitionOptions[];
