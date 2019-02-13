// ====================================================================
// XEP-0261: Jingle In-Band Bytestreams Transport Method
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0047.html
// Version: 1.0 (2011-09-23)
// ====================================================================

import {
    attribute,
    DefinitionOptions,
    integerAttribute,
    TranslationContext,
    XMLElement
} from '../../jxt';

import { NS_JINGLE_IBB_1 } from '../Namespaces';
import './rfc6120';
import { JingleTransport } from './xep0166';

export interface JingleIBB extends JingleTransport {
    transportType: typeof NS_JINGLE_IBB_1;
    sid: string;
    blockSize?: number;
    ack?: boolean;
}

export default {
    element: 'transport',
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
    namespace: NS_JINGLE_IBB_1,
    path: 'iq.jingle.contents.transport',
    type: NS_JINGLE_IBB_1,
    typeField: 'transportType'
} as DefinitionOptions;
