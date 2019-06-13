import { Agent } from '../';
import { NS_CHAT_STATES, ReceivedMessage } from '../protocol';
import { Message } from '../protocol';

declare module '../' {
    export interface AgentEvents {
        'chat:state': ChatStateMessage;
    }
}

export type ChatStateMessage = ReceivedMessage & {
    chatState: ReceivedMessage['chatState'];
};

const ALLOWED_TYPES = ['chat', 'groupcaht', 'normal'];

function isChatState(msg: Message): msg is ChatStateMessage {
    return !!msg.chatState;
}

export default function(client: Agent) {
    client.disco.addFeature(NS_CHAT_STATES);

    client.on('message', msg => {
        if (ALLOWED_TYPES.indexOf(msg.type || 'normal') < 0) {
            return;
        }

        if (isChatState(msg)) {
            client.emit('chat:state', msg);
        }
    });
}
