'use strict';


module.exports = function (client) {

    client.disco.addFeature('http://jabber.org/protocol/chatstates');

    client.on('message', function (msg) {
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
};
