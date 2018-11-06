import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.CHAT_STATES);

    const allowedTypes = ['chat', 'groupchat', 'normal'];

    client.on('message', function(msg) {
        if (allowedTypes.indexOf(msg.type || 'normal') < 0) {
            return;
        }

        if (msg.chatState) {
            client.emit('chat:state', {
                to: msg.to,
                from: msg.from,
                chatState: msg.chatState
            });
            client.emit('chatState', {
                to: msg.to,
                from: msg.from,
                chatState: msg.chatState
            });
        }
    });
}
