// ====================================================================
// XEP-0138: Stream Compression
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0138.html
// Version: 2.0 (2009-05-27)
// ====================================================================

import { childEnum, childText, DefinitionOptions, multipleChildText } from '../../jxt';

import { NS_COMPRESSION, NS_COMPRESSION_FEATURE } from './namespaces';
import './rfc6120';

declare module './rfc6120' {
    export interface StreamFeatures {
        compression?: CompressionFeature;
    }
}

export interface CompressionFeature {
    methods: string[];
}

export interface CompressionStart {
    type: 'start';
    method: string;
}

export interface CompressionFailure {
    type: 'failure';
    condition: 'unsupported-method' | 'setup-failed' | 'processing-failed';
}

export interface CompressionSuccess {
    type: 'success';
}

export type Compression = CompressionStart | CompressionFailure | CompressionSuccess;

export default [
    {
        element: 'compression',
        fields: {
            methods: multipleChildText(null, 'method')
        },
        namespace: NS_COMPRESSION_FEATURE,
        path: 'features.compression'
    },
    {
        element: 'compress',
        fields: {
            method: childText(null, 'method')
        },
        namespace: NS_COMPRESSION,
        path: 'compression',
        type: 'start',
        typeField: 'type'
    },
    {
        aliases: ['error.compressionError'],
        element: 'failure',
        fields: {
            condition: childEnum(null, ['unsupported-method', 'setup-failed', 'processing-failed'])
        },
        namespace: NS_COMPRESSION,
        path: 'compression',
        type: 'failure',
        typeField: 'type'
    },
    {
        element: 'compressed',
        namespace: NS_COMPRESSION,
        path: 'compression',
        type: 'success',
        typeField: 'type'
    }
] as DefinitionOptions[];
