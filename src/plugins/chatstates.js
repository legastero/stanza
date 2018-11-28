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
                chatState: msg.chatState,
                from: msg.from,
                to: msg.to
            });
            client.emit('chatState', {
                chatState: msg.chatState,
                from: msg.from,
                to: msg.to
            });
        }
    });
}
