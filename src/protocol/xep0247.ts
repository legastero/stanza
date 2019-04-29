// ====================================================================
// XEP-0247: Jingle XML Streams
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0247.html
// Version: 0.2 (2009-02-20)
// ====================================================================

import { DefinitionOptions } from '../jxt';

import { JingleApplication } from './';
import { NS_JINGLE_XML_0 } from './Namespaces';

export interface JingleXMLStreamDescription extends JingleApplication {
    applicationType: typeof NS_JINGLE_XML_0;
}

export default {
    element: 'description',
    namespace: NS_JINGLE_XML_0,
    path: 'iq.jingle.contents.application',
    type: NS_JINGLE_XML_0,
    typeField: 'applicationType'
} as DefinitionOptions;
