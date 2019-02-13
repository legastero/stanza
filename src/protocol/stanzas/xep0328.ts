// ====================================================================
// XEP-0328: JID Prep
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0328.html
// Version: 0.1 (2013-05-28)
// ====================================================================

import { DefinitionOptions } from '../../jxt';

import { NS_JID_PREP_0 } from '../Namespaces';
import './rfc6120';
import { childJID, extendIQ, JID } from './util';

declare module './rfc6120' {
    export interface IQ {
        jidPrep?: JID;
    }
}

export default extendIQ({
    jidPrep: childJID(NS_JID_PREP_0, 'jidprep')
}) as DefinitionOptions;
