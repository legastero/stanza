// ====================================================================
// XEP-0054: vcard-temp
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0054.html
// Version: 1.2 (2008-07-16)
// ====================================================================

import {
    childBoolean,
    childText,
    DefinitionOptions,
    multipleChildEnum,
    multipleChildText,
    text
} from '../jxt';

import { NS_VCARD_TEMP } from '../Namespaces';
import { JID } from './util';

declare module './' {
    export interface IQ {
        vcard?: VCardTemp;
    }
}

export interface VCardTemp {
    format?: typeof NS_VCARD_TEMP;
    fullName?: string;
    name?: VCardTempName;
    records?: VCardTempRecord[];
}

export interface VCardTempName {
    family?: string;
    given?: string;
    middle?: string;
    prefix?: string;
    suffix?: string;
}

export interface VCardTempPhoto {
    type: 'photo';
    data?: Buffer;
    mediaType?: string;
    url?: string;
}

export interface VCardTempLogo {
    type: 'photo';
    data?: Buffer;
    mediaType?: string;
    url?: string;
}

export interface VCardTempAddress {
    type: 'address';
}

export interface VCardTempAddressLabel {
    type: 'addressLabel';
}

export interface VCardTempPhone {
    type: 'tel';
}

export interface VCardTempEmail {
    type: 'email';
    value?: string;
    home?: boolean;
    preferred?: boolean;
    work?: boolean;
}

export interface VCardTempJID {
    type: 'jid';
    jid?: JID;
}

export interface VCardTempCategories {
    type: 'categories';
    value: string[];
}

export interface VCardTempField {
    type:
        | 'nickname'
        | 'birthday'
        | 'jid'
        | 'url'
        | 'title'
        | 'role'
        | 'description'
        | 'sort'
        | 'revision'
        | 'uid'
        | 'productId'
        | 'note'
        | 'timezone';
    value: string;
}

export interface VCardTempOrg {
    type: 'organization';
    value?: string;
    unit?: string;
}

export type VCardTempRecord =
    | VCardTempPhoto
    | VCardTempAddress
    | VCardTempAddressLabel
    | VCardTempPhone
    | VCardTempEmail
    | VCardTempOrg
    | VCardTempLogo
    | VCardTempCategories;

function vcardField(element: string, type: string): DefinitionOptions {
    return {
        aliases: [{ multiple: true, path: 'vcardTemp.records' }],
        element,
        fields: {
            value: text()
        },
        namespace: NS_VCARD_TEMP,
        type,
        typeField: 'type'
    };
}

export default [
    {
        aliases: [{ path: 'iq.vcard' }],
        defaultType: NS_VCARD_TEMP,
        element: 'vCard',
        fields: {
            fullName: childText(null, 'FN')
        },
        namespace: NS_VCARD_TEMP,
        path: 'vcardTemp',
        type: NS_VCARD_TEMP,
        typeField: 'format'
    },
    {
        element: 'N',
        fields: {
            additional: { ...childText(null, 'MIDDLE'), order: 3 },
            family: { ...childText(null, 'FAMILY'), order: 1 },
            given: { ...childText(null, 'GIVEN'), order: 2 },
            prefix: { ...childText(null, 'PREFIX'), order: 4 },
            suffix: { ...childText(null, 'SUFFIX'), order: 5 }
        },
        namespace: NS_VCARD_TEMP,
        path: 'vcardTemp.name'
    },
    vcardField('NICKNAME', 'nickname'),
    vcardField('BDAY', 'birthday'),
    vcardField('JABBERID', 'jid'),
    vcardField('TZ', 'timezone'),
    vcardField('TITLE', 'title'),
    vcardField('ROLE', 'role'),
    vcardField('URL', 'url'),
    vcardField('NOTE', 'note'),
    vcardField('SORT-STRING', 'sort'),
    vcardField('UID', 'uid'),
    vcardField('REV', 'revision'),
    vcardField('PRODID', 'productId'),
    vcardField('DESC', 'description'),
    {
        aliases: [{ multiple: true, path: 'vcardTemp.records' }],
        element: 'EMAIL',
        fields: {
            preferred: childBoolean(null, 'PREF'),
            types: multipleChildEnum(null, [
                ['home', 'HOME'],
                ['work', 'WORK'],
                ['internet', 'INTERNET']
            ]),
            value: childText(null, 'USERID')
        },
        namespace: NS_VCARD_TEMP,
        type: 'email'
    },
    {
        aliases: [{ path: 'vcardTemp.records', multiple: true }],
        element: 'ORG',
        fields: {
            units: { ...multipleChildText(null, 'ORGUNIT'), order: 2 },
            value: { ...childText(null, 'ORGNAME'), order: 1 }
        },
        namespace: NS_VCARD_TEMP,
        type: 'organization',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path: 'vcardTemp.records' }],
        element: 'ADR',
        fields: {
            city: childText(null, 'LOCALITY'),
            code: childText(null, 'PCODE'),
            country: childText(null, 'CTRY'),
            pobox: childText(null, 'POBOX'),
            preferred: childBoolean(null, 'PREF'),
            region: childText(null, 'REGION'),
            street: childText(null, 'STREET'),
            street2: childText(null, 'EXTADD'),
            types: multipleChildEnum(null, [
                ['home', 'HOME'],
                ['work', 'WORK'],
                ['domestic', 'DOM'],
                ['international', 'INTL'],
                ['postal', 'POSTAL'],
                ['parcel', 'PARCEL']
            ])
        },
        namespace: NS_VCARD_TEMP,
        type: 'address',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path: 'vcardTemp.records' }],
        element: 'LABEL',
        fields: {
            lines: multipleChildText(null, 'LINE'),
            preferred: childBoolean(null, 'PREF'),
            types: multipleChildEnum(null, [['home', 'HOME'], ['work', 'WORK']])
        },
        namespace: NS_VCARD_TEMP,
        type: 'addressLabel',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path: 'vcardTemp.records' }],
        element: 'TEL',
        fields: {
            preferred: childBoolean(null, 'PREF'),
            types: multipleChildEnum(null, [
                ['home', 'HOME'],
                ['work', 'WORK'],
                ['cell', 'CELL'],
                ['fax', 'FAX'],
                ['voice', 'VOICE'],
                ['msg', 'MSG']
            ]),
            value: childText(null, 'NUMBER', '')
        },
        namespace: NS_VCARD_TEMP,
        type: 'tel',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path: 'vcardTemp.records' }],
        element: 'PHOTO',
        fields: {
            data: childText(null, 'BINVAL'),
            mediaType: childText(null, 'TYPE'),
            url: childText(null, 'EXTVAL')
        },
        namespace: NS_VCARD_TEMP,
        type: 'photo',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path: 'vcardTemp.records' }],
        element: 'LOGO',
        fields: {
            data: childText(null, 'BINVAL'),
            mediaType: childText(null, 'TYPE'),
            url: childText(null, 'EXTVAL')
        },
        namespace: NS_VCARD_TEMP,
        type: 'logo',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path: 'vcardTemp.records' }],
        element: 'CATEGORIES',
        fields: {
            value: multipleChildText(null, 'KEYWORD')
        },
        namespace: NS_VCARD_TEMP,
        type: 'categories',
        typeField: 'type'
    }
] as DefinitionOptions[];
