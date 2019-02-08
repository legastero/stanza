// ====================================================================
// XEP-0122: Data Forms Validation
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0122.html
// Version: 1.0.1 (2018-03-05)
// ====================================================================

import {
    attribute,
    childAttribute,
    childEnum,
    childIntegerAttribute,
    childText,
    DefinitionOptions
} from '../../jxt';

import { NS_DATAFORM_VALIDATION } from './namespaces';
import './xep0004';

declare module './xep0004' {
    export interface DataFormFieldBase {
        validation?: DataFormValidation;
    }
}

export interface DataFormValidation {
    type: string;
    method: 'basic' | 'open' | 'range' | 'regex';
    rangeMin?: string;
    rangeMax?: string;
    listMin?: number;
    listMax?: number;
    regex?: string;
}

export default {
    element: 'validate',
    fields: {
        listMax: childIntegerAttribute(null, 'list-range', 'max'),
        listMin: childIntegerAttribute(null, 'list-range', 'min'),
        method: childEnum(null, ['basic', 'open', 'range', 'regex'], 'basic'),
        rangeMax: childAttribute(null, 'range', 'max'),
        rangeMin: childAttribute(null, 'range', 'min'),
        regex: childText(null, 'regex'),
        type: attribute('datatype', 'xs:string')
    },
    namespace: NS_DATAFORM_VALIDATION,
    path: 'dataform.fields.validation'
} as DefinitionOptions;
