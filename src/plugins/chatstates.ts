import { Agent } from '../Definitions';
import { NS_CHAT_STATES } from '../protocol';
import { Message } from '../protocol/stanzas';

const ALLOWED_TYPES = ['chat', 'groupcaht', 'normal'];

export default function(client: Agent) {
    client.disco.addFeature(NS_CHAT_STATES);

    client.on('message', (msg: Message) => {
        if (ALLOWED_TYPES.indexOf(msg.type || 'normal') < 0) {
            return;
        }

        if (msg.chatState) {
            client.emit('chat:state', msg);
        }
    });
}
