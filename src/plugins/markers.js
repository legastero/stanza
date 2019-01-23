import { JID } from '../protocol/jid';
import { Namespaces } from '../protocol';

export default function(client) {
    function enabled(msg) {
        return msg.markable && client.config.chatMarkers !== false;
    }

    client.disco.addFeature(Namespaces.CHAT_MARKERS_0);

    client.on('message', function(msg) {
        if (enabled(msg)) {
            client.markReceived(msg);
            return;
        }

        if (msg.received) {
            return client.emit('marker:received', msg);
        }

        if (msg.displayed) {
            return client.emit('marker:displayed', msg);
        }

        if (msg.acknowledged) {
            return client.emit('marker:acknowledged', msg);
        }
    });

    client.markReceived = function(msg) {
        if (enabled(msg)) {
            const to = msg.type === 'groupchat' ? new JID(msg.from.bare) : msg.from;
            client.sendMessage({
                body: '',
                received: msg.id,
                to,
                type: msg.type
            });
        }
    };

    client.markDisplayed = function(msg) {
        if (enabled(msg)) {
            const to = msg.type === 'groupchat' ? new JID(msg.from.bare) : msg.from;
            client.sendMessage({
                body: '',
                displayed: msg.id,
                to,
                type: msg.type
            });
        }
    };

    client.markAcknowledged = function(msg) {
        if (enabled(msg)) {
            const to = msg.type === 'groupchat' ? new JID(msg.from.bare) : msg.from;
            client.sendMessage({
                acknowledged: msg.id,
                body: '',
                to,
                type: msg.type
            });
        }
    };
}
