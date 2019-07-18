// ====================================================================
// XEP-0384: OMEMO Encryption
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0384.html
// Version: 0.3.0 (2018-07-31)
// ====================================================================

import {
    booleanAttribute,
    childTextBuffer,
    DefinitionOptions,
    integerAttribute,
    multipleChildIntegerAttribute,
    pubsubItemContentAliases,
    splicePath,
    textBuffer
} from '../jxt';

import {
    NS_OMEMO_AXOLOTL,
    NS_OMEMO_AXOLOTL_BUNDLES,
    NS_OMEMO_AXOLOTL_DEVICELIST
} from '../Namespaces';

declare module './' {
    export interface Message {
        omemo?: OMEMO;
    }
}

export interface OMEMO {
    header: {
        iv: Buffer;
        sid: string;
        keys: OMEMOKey[];
    };
    payload?: Buffer;
}

export interface OMEMOKey {
    preKey?: boolean;
    rid: string;
    value: Buffer;
}

export interface OMEMOPreKey {
    id: string;
    value: Buffer;
}

export interface OMEMODevice {
    itemType?: typeof NS_OMEMO_AXOLOTL_BUNDLES;
    identityKey: Buffer;
    preKeys: OMEMOPreKey[];
    signedPreKeyPublic: {
        id: string;
        value: Buffer;
    };
    signedPreKeySignature: Buffer;
}

export interface OMEMODeviceList {
    itemType?: typeof NS_OMEMO_AXOLOTL_DEVICELIST;
    devices: string[];
}

const Protocol: DefinitionOptions[] = [
    {
        aliases: ['message.omemo'],
        element: 'encrypted',
        fields: {
            payload: childTextBuffer(null, 'payload', 'base64')
        },
        namespace: NS_OMEMO_AXOLOTL,
        path: 'omemo'
    },
    {
        element: 'header',
        fields: {
            iv: childTextBuffer(null, 'iv', 'base64'),
            sid: integerAttribute('sid')
        },
        namespace: NS_OMEMO_AXOLOTL,
        path: 'omemo.header'
    },
    {
        aliases: [{ path: 'omemo.header.keys', multiple: true }],
        element: 'key',
        fields: {
            preKey: booleanAttribute('prekey'),
            rid: integerAttribute('rid'),
            value: textBuffer('base64')
        },
        namespace: NS_OMEMO_AXOLOTL
    },
    {
        aliases: pubsubItemContentAliases(),
        element: 'list',
        fields: {
            devices: multipleChildIntegerAttribute(null, 'device', 'id')
        },
        namespace: NS_OMEMO_AXOLOTL,
        type: NS_OMEMO_AXOLOTL_DEVICELIST,
        typeField: 'itemType'
    },
    {
        element: 'preKeyPublic',
        fields: {
            id: integerAttribute('preKeyId'),
            value: textBuffer('base64')
        },
        namespace: NS_OMEMO_AXOLOTL,
        path: 'omemoPreKey'
    },
    {
        element: 'signedPreKeyPublic',
        fields: {
            id: integerAttribute('signedPreKeyId'),
            value: textBuffer('base64')
        },
        namespace: NS_OMEMO_AXOLOTL,
        path: 'omemoDevice.signedPreKeyPublic'
    },
    {
        aliases: pubsubItemContentAliases(),
        element: 'bundle',
        fields: {
            identityKey: childTextBuffer(null, 'identityKey', 'base64'),
            preKeys: splicePath(null, 'prekeys', 'omemoPreKey', true),
            signedPreKeySignature: childTextBuffer(null, 'signedPreKeySignature', 'base64')
        },
        namespace: NS_OMEMO_AXOLOTL,
        path: 'omemoDevice',
        type: NS_OMEMO_AXOLOTL_BUNDLES,
        typeField: 'itemType'
    }
];
export default Protocol;
