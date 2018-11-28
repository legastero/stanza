import { Namespaces } from '../protocol';

export default function(client) {
    function enabled(msg) {
        return msg.markable && client.config.chatMarkers !== false;
    }

    client.disco.addFeature(Namespaces.CHAT_MARKERS_0);

    client.on('message', function(msg) {
        if (enabled(msg)) {
            client.sendMessage({
                received: msg.id,
                to: msg.from
            });
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

    client.markDisplayed = function(msg) {
        if (enabled(msg)) {
            client.sendMessage({
                displayed: msg.id,
                to: msg.from
            });
        }
    };

    client.markAcknowledged = function(msg) {
        if (enabled(msg)) {
            client.sendMessage({
                acknowledged: msg.id,
                to: msg.from
            });
        }
    };
}
