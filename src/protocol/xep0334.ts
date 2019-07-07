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
                        break;
                    case 'no-permanent-store':
                        results.noPermanentStore = true;
                        break;
                    case 'no-store':
                        results.noStore = true;
                        break;
                    case 'store':
                        results.store = true;
                        break;
                }
            }

            return results;
        },
        exporter(xml, value) {
            if (value.noCopy) {
                xml.appendChild(createElement(NS_HINTS, 'no-copy'));
            }
            if (value.noPermanentStore) {
                xml.appendChild(createElement(NS_HINTS, 'no-permanent-store'));
            }
            if (value.noStore) {
                xml.appendChild(createElement(NS_HINTS, 'no-store'));
            }
            if (value.store) {
                xml.appendChild(createElement(NS_HINTS, 'store'));
            }
        }
    };
}

export default [
    extendMessage({
        processingHints: processingHints()
    })
];
