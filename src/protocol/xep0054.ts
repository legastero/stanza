// ====================================================================
// XEP-0054: vcard-temp
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0054.html
// Version: 1.2 (2008-07-16)
// ====================================================================

import { JID } from '../JID';
import {
    childBoolean,
    childText,
    DefinitionOptions,
    multipleChildEnum,
    multipleChildText,
    text
} from '../jxt';
import { NS_VCARD_TEMP } from '../Namespaces';

declare module './' {
    export interface IQPayload {
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

type VCardTempAddressType =
    | 'home'
    | 'work'
    | 'domestic'
    | 'international'
    | 'postal'
    | 'parcel';

export interface VCardTempAddress {
    type: 'address';
    city?: string;
    code?: string;
    country?: string;
    pobox?: string;
    preferred?: boolean;
    region?: string;
    street?: string;
    street2?: string;
    types?: VCardTempAddressType[];
}

type VCardTempAddressLabelType =
    | 'home'
    | 'work';
    
export interface VCardTempAddressLabel {
    type: 'addressLabel';
    lines?: string;
    preferred?: boolean;
    types?: VCardTempAddressLabelType[];
}

type VCardTempPhoneType =
    | 'home'
    | 'work'
    | 'cell'
    | 'fax'
    | 'voice'
    | 'msg';

export interface VCardTempPhone {
    type: 'tel';
    value?: string;
    preferred?: boolean;
    types?: VCardTempPhoneType[];
}

type VCardTempEmailType =
    | 'home'
    | 'internet'
    | 'work';

export interface VCardTempEmail {
    type: 'email';
    value?: string;
    preferred?: boolean;
    types?: VCardTempEmailType[];
}

export interface VCardTempJID {
    type: 'jid';
    jid?: JID;
}

export interface VCardTempCategories {
    type: 'categories';
    value: string[];
}

type VCardFieldType =
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
export interface VCardTempField {
    type: VCardFieldType;
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
    | VCardTempCategories
    | VCardTempField;

const path = 'vcardTemp.records';

function vcardField(element: string, type: string): DefinitionOptions {
    return {
        aliases: [{ multiple: true, path }],
        element,
        fields: {
            value: text()
        },
        namespace: NS_VCARD_TEMP,
        type,
        typeField: 'type'
    };
}

const Protocol: DefinitionOptions[] = [
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
        aliases: [{ multiple: true, path }],
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
        aliases: [{ path, multiple: true }],
        element: 'ORG',
        fields: {
            unit: { ...childText(null, 'ORGUNIT'), order: 2 },
            value: { ...childText(null, 'ORGNAME'), order: 1 }
        },
        namespace: NS_VCARD_TEMP,
        type: 'organization',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path }],
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
        aliases: [{ multiple: true, path }],
        element: 'LABEL',
        fields: {
            lines: multipleChildText(null, 'LINE'),
            preferred: childBoolean(null, 'PREF'),
            types: multipleChildEnum(null, [
                ['home', 'HOME'],
                ['work', 'WORK']
            ])
        },
        namespace: NS_VCARD_TEMP,
        type: 'addressLabel',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path }],
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
            value: childText(null, 'NUMBER', '', true)
        },
        namespace: NS_VCARD_TEMP,
        type: 'tel',
        typeField: 'type'
    },
    {
        aliases: [{ multiple: true, path }],
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
        aliases: [{ multiple: true, path }],
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
        aliases: [{ multiple: true, path }],
        element: 'CATEGORIES',
        fields: {
            value: multipleChildText(null, 'KEYWORD')
        },
        namespace: NS_VCARD_TEMP,
        type: 'categories',
        typeField: 'type'
    }
];
export default Protocol;
