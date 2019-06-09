// ====================================================================
// XEP-0004: Data Forms
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0004.html
// Version: 2.9 (2007-08-13)
// ====================================================================

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

import { NS_DATAFORM } from './Namespaces';
import { JID } from './util';

declare module './' {
    export interface Message {
        forms?: DataForm[];
    }
}

export interface DataForm {
    type?: 'form' | 'submit' | 'cancel' | 'result';
    title?: string;
    instructions?: string | string[];
    reported?: DataFormField[];
    items?: DataFormItem[];
    fields?: DataFormField[];
}

export interface DataFormItem {
    fields: DataFormField[];
}

export interface DataFormFieldBase {
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
    type: 'fixed' | 'hidden' | 'text-private' | 'text-single';
    value?: string;
}

export interface DataFormFieldTextMulti extends DataFormFieldBase {
    type: 'text-multi';
    value?: string[];
}

export interface DataFormFieldList extends DataFormFieldBase {
    type: 'list-single';
    value?: string;
    options?: Array<DataFormFieldOption<string>>;
}

export interface DataFormFieldListMulti extends DataFormFieldBase {
    type: 'list-multi';
    value?: string[];
    options?: Array<DataFormFieldOption<string>>;
}

export interface DataFormFieldJID extends DataFormFieldBase {
    type: 'jid-single';
    value?: JID;
    options?: Array<DataFormFieldOption<JID>>;
}

export interface DataFormFieldJIDMulti extends DataFormFieldBase {
    type: 'jid-multi';
    value?: JID[];
    options?: Array<DataFormFieldOption<JID>>;
}

export interface DataFormFieldAny extends DataFormFieldBase {
    type?: undefined;
    value?: boolean | string | string[] | JID | JID[];
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
                ): boolean | string | string[] | JID | JID[] | undefined {
                    const fieldType = xml.getAttribute('type');
                    const converter = multipleChildText(NS_DATAFORM, 'value');
                    const rawValues: string[] = converter.importer(xml, context) || [];
                    const singleValue = rawValues[0];

                    switch (fieldType) {
                        case 'text-multi':
                            return rawValues;
                        case 'list-multi':
                            return rawValues;
                        case 'hidden':
                        case 'fixed':
                            if (rawValues.length === 1) {
                                return singleValue;
                            }
                            return rawValues;
                        case 'jid-multi':
                            return rawValues.map(value => {
                                return value;
                            });
                        case 'jid':
                            if (singleValue) {
                                return singleValue;
                            }
                            break;
                        case 'boolean':
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
                    data: boolean | string | JID | string[] | JID[],
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
