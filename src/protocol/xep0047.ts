// ====================================================================
// XEP-0047: In-band Bytestreams
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0047.html
// Version: 2.0 (2012-06-22)
// ====================================================================

import {
    attribute,
    DefinitionOptions,
    integerAttribute,
    textBuffer,
    TranslationContext,
    XMLElement
} from '../jxt';

import { NS_IBB } from '../Namespaces';

declare module './' {
    export interface Message {
        ibb?: IBBData;
    }

    export interface IQPayload {
        ibb?: IBB;
    }
}

export interface IBBRequest {
    type: 'open' | 'close';
    sid: string;
    blockSize?: number;
    ack?: boolean;
}

export interface IBBData {
    type: 'data';
    sid: string;
    seq: number;
    data: Buffer;
}

export type IBB = IBBRequest | IBBData;

export default [
    {
        aliases: ['iq.ibb', 'message.ibb'],
        element: 'open',
        fields: {
            ack: {
                importer(xml: XMLElement, context: TranslationContext): boolean {
                    const stanza = attribute('stanza', 'iq').importer(xml, context);
                    return stanza !== 'message';
                },
                exporter(xml: XMLElement, data: boolean, context: TranslationContext) {
                    attribute('stanza').exporter(xml, data ? 'iq' : 'message', context);
                }
            },
            blockSize: integerAttribute('block-size'),
            sid: attribute('sid')
        },
        namespace: NS_IBB,
        type: 'open',
        typeField: 'action'
    },
    {
        aliases: ['iq.ibb', 'message.ibb'],
        element: 'close',
        fields: {
            sid: attribute('sid')
        },
        namespace: NS_IBB,
        type: 'close',
        typeField: 'action'
    },
    {
        aliases: ['iq.ibb', 'message.ibb'],
        element: 'data',
        fields: {
            data: textBuffer('base64'),
            seq: integerAttribute('seq'),
            sid: attribute('sid')
        },
        namespace: NS_IBB,
        type: 'data',
        typeField: 'action'
    }
] as DefinitionOptions[];
