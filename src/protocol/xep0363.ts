// ====================================================================
// XEP-0363: HTTP File Upload
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0363.html
// Version: 0.5.0 (2018-02-15)
// ====================================================================

import {
    attribute,
    childAttribute,
    childDateAttribute,
    childEnum,
    deepChildInteger,
    DefinitionOptions,
    extendStanzaError,
    integerAttribute,
    text
} from '../jxt';
import { NS_HTTP_UPLOAD_0 } from '../Namespaces';

declare module './' {
    export interface IQPayload {
        httpUpload?: HTTPUploadRequest | HTTPUploadSlot;
    }

    export interface StanzaError {
        httpUploadError?: 'file-too-large' | 'retry';
        httpUploadMaxFileSize?: number;
        httpUpoadRetry?: Date;
    }
}

export interface HTTPUploadRequest {
    type?: 'request';
    name: string;
    size: number;
    mediaType?: string;
}

export interface HTTPUploadSlot {
    type?: 'slot';
    upload: HTTPUploadLocation;
    download: string;
}

export interface HTTPUploadLocation {
    uri: string;
    headers?: HTTPUploadHeader[];
}

export interface HTTPUploadHeader {
    name: string;
    value: string;
}

export default [
    extendStanzaError({
        httpUploadError: childEnum(NS_HTTP_UPLOAD_0, ['file-too-large', 'retry']),
        httpUploadMaxFileSize: deepChildInteger([
            { namespace: NS_HTTP_UPLOAD_0, element: 'file-too-large' },
            { namespace: NS_HTTP_UPLOAD_0, element: 'max-file-size' }
        ]),
        httpUploadRetry: childDateAttribute(NS_HTTP_UPLOAD_0, 'retry', 'stamp')
    }),
    {
        element: 'request',
        fields: {
            mediaType: attribute('content-type'),
            name: attribute('filename'),
            size: integerAttribute('size')
        },
        namespace: NS_HTTP_UPLOAD_0,
        path: 'iq.httpUpload',
        type: 'request',
        typeField: 'type'
    },
    {
        element: 'slot',
        fields: {
            download: childAttribute(null, 'get', 'uri')
        },
        namespace: NS_HTTP_UPLOAD_0,
        path: 'iq.httpUpload',
        type: 'slot'
    },
    {
        aliases: [{ path: 'iq.httpUpload.upload', selector: 'slot' }],
        element: 'put',
        fields: {
            uri: attribute('uri')
        },
        namespace: NS_HTTP_UPLOAD_0
    },
    {
        aliases: [{ path: 'iq.httpUpload.upload.headers', multiple: true }],
        element: 'put',
        fields: {
            name: attribute('name'),
            value: text()
        },
        namespace: NS_HTTP_UPLOAD_0
    }
] as DefinitionOptions[];
