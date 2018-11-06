'use strict';

export default function (client) {

    function enabled(msg) {
        return msg.markable && client.config.chatMarkers !== false;
    }

    client.disco.addFeature('urn:xmpp:chat-markers:0');

    client.on('message', function(msg) {
        if (enabled(msg)) {
            client.sendMessage({
                to: msg.from,
                received: msg.id
            });
            return ;
        }

        if (msg.received) {
            return client.emit('marker:received', msg.received);
        }

        if (msg.displayed) {
            return client.emit('marker:displayed', msg.displayed);
        }

        if (msg.acknowledged) {
            return client.emit('marker:acknowledged', msg.acknowledged);
        }
    });
    
    client.markDisplayed = function(msg) {
        if (enabled(msg)) {
            client.sendMessage({
                to: msg.from,
                displayed: msg.id
            });
        }
    };

    client.markAcknowledged = function(msg) {
        if (enabled(msg)) {
            client.sendMessage({
                to: msg.from,
                acknowledged: msg.id
            });
        }
    };
}
