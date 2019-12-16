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
} from '../jxt';
import { NS_JINGLE_IBB_1 } from '../Namespaces';

import { JingleTransport } from './';

export interface JingleIBB extends JingleTransport {
    transportType: typeof NS_JINGLE_IBB_1;
    sid: string;
    blockSize?: number;
    ack?: boolean;
}

const Protocol: DefinitionOptions = {
    element: 'transport',
    fields: {
        ack: {
            importer(xml: XMLElement, context: TranslationContext): boolean {
                const stanza = attribute('stanza', 'iq').importer(xml, context);
                return stanza !== 'message';
            },
            exporter(xml: XMLElement, data: boolean, context: TranslationContext) {
                if (data === false) {
                    attribute('stanza').exporter(xml, 'message', context);
                }
            }
        },
        blockSize: integerAttribute('block-size'),
        sid: attribute('sid')
    },
    namespace: NS_JINGLE_IBB_1,
    path: 'iq.jingle.contents.transport',
    type: NS_JINGLE_IBB_1,
    typeField: 'transportType'
};
export default Protocol;
