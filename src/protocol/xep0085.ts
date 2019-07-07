// ====================================================================
// XEP-0085: Chat State Notifications
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0085.html
// Version: 2.1 (2009-09-23)
// ====================================================================

import { ChatState, toList } from '../Constants';
import { childEnum, extendMessage } from '../jxt';
import { NS_CHAT_STATES } from '../Namespaces';

declare module './' {
    export interface Message {
        chatState?: ChatState;
    }
}

export default extendMessage({
    chatState: childEnum(NS_CHAT_STATES, toList(ChatState))
});
