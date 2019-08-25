// ====================================================================
// XEP-0334: Message Processing Hints
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0334.html
// Version: 0.3.0 (2018-01-25)
// ====================================================================

import { createElement, extendMessage, FieldDefinition } from '../jxt';
import { NS_HINTS } from '../Namespaces';

declare module './' {
    export interface Message {
        processingHints?: ProcessingHints;
    }
}

export interface ProcessingHints {
    noCopy?: boolean;
    noPermanentStore?: boolean;
    noStore?: boolean;
    store?: boolean;
}

function processingHints(): FieldDefinition<ProcessingHints> {
    return {
        importer(xml) {
            const results: ProcessingHints = {};
            let found = false;

            for (const child of xml.children) {
                if (typeof child === 'string') {
                    continue;
                }

                if (child.getNamespace() !== NS_HINTS) {
                    continue;
                }

                switch (child.getName()) {
                    case 'no-copy':
                        results.noCopy = true;
                        found = true;
                        break;
                    case 'no-permanent-store':
                        results.noPermanentStore = true;
                        found = true;
                        break;
                    case 'no-store':
                        results.noStore = true;
                        found = true;
                        break;
                    case 'store':
                        results.store = true;
                        found = true;
                        break;
                }
            }

            return found ? results : undefined;
        },
        exporter(xml, value, context) {
            if (value.noCopy) {
                xml.appendChild(createElement(NS_HINTS, 'no-copy', context.namespace, xml));
            }
            if (value.noPermanentStore) {
                xml.appendChild(
                    createElement(NS_HINTS, 'no-permanent-store', context.namespace, xml)
                );
            }
            if (value.noStore) {
                xml.appendChild(createElement(NS_HINTS, 'no-store', context.namespace, xml));
            }
            if (value.store) {
                xml.appendChild(createElement(NS_HINTS, 'store', context.namespace, xml));
            }
        }
    };
}

export default extendMessage({
    processingHints: processingHints()
});
