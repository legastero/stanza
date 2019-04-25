// ====================================================================
// XEP-0085: Chat State Notifications
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0085.html
// Version: 2.1 (2009-09-23)
// ====================================================================

import { childEnum, DefinitionOptions } from '../jxt';

import { NS_CHAT_STATES } from './Namespaces';

import { extendMessage } from './util';

declare module './' {
    export interface Message {
        chatState?: 'active' | 'composing' | 'paused' | 'inactive' | 'gone';
    }
}

export default extendMessage({
    chatState: childEnum(NS_CHAT_STATES, ['active', 'composing', 'paused', 'inactive', 'gone'])
});
