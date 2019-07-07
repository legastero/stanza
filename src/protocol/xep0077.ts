// ====================================================================
// XEP-0077: In-Band Registration
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0077.html
// Version: 2.4 (2012-01-253)
// ====================================================================

import {
    addAlias,
    childBoolean,
    childDate,
    childText,
    DefinitionOptions,
    extendStreamFeatures
} from '../jxt';
import { NS_DATAFORM, NS_INBAND_REGISTRATION, NS_OOB, NS_REGISTER } from '../Namespaces';

import { DataForm, Link } from './';

declare module './' {
    export interface StreamFeatures {
        inbandRegistration?: boolean;
    }

    export interface IQPayload {
        account?: AccountManagement;
    }
}

export interface AccountManagement {
    registered?: boolean;
    instructions?: string;
    username?: string;
    nick?: string;
    password?: string;
    fullName?: string;
    givenName?: string;
    familyName?: string;
    email?: string;
    address?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    phone?: string;
    uri?: string;
    date?: Date;
    misc?: string;
    text?: string;
    key?: string;
    remove?: boolean;
    form?: DataForm;
    registrationLink?: Link;
}

export default [
    extendStreamFeatures({
        inbandRegistration: childBoolean(NS_INBAND_REGISTRATION, 'register')
    }),
    addAlias(NS_DATAFORM, 'x', ['iq.account.form']),
    addAlias(NS_OOB, 'x', ['iq.account.registrationLink']),
    {
        element: 'query',
        fields: {
            address: childText(null, 'address'),
            date: childDate(null, 'date'),
            email: childText(null, 'email'),
            familyName: childText(null, 'last'),
            fullName: childText(null, 'name'),
            givenName: childText(null, 'first'),
            instructions: childText(null, 'instructions'),
            key: childText(null, 'key'),
            locality: childText(null, 'city'),
            misc: childText(null, 'misc'),
            nick: childText(null, 'nick'),
            password: childText(null, 'password'),
            phone: childText(null, 'phone'),
            postalCode: childText(null, 'zip'),
            region: childText(null, 'state'),
            registered: childBoolean(null, 'registered'),
            remove: childBoolean(null, 'remove'),
            text: childText(null, 'text'),
            uri: childText(null, 'uri'),
            username: childText(null, 'username')
        },
        namespace: NS_REGISTER,
        path: 'iq.account'
    }
] as DefinitionOptions[];
