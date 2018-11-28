import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.BLOCKING);

    client.block = function(jid, cb) {
        return client.sendIq(
            {
                block: {
                    jids: [jid]
                },
                type: 'set'
            },
            cb
        );
    };

    client.unblock = function(jid, cb) {
        return client.sendIq(
            {
                type: 'set',
                unblock: {
                    jids: [jid]
                }
            },
            cb
        );
    };

    client.getBlocked = function(cb) {
        return client.sendIq(
            {
                blockList: true,
                type: 'get'
            },
            cb
        );
    };

    client.on('iq:set:block', function(iq) {
        client.emit('block', {
            jids: iq.block.jids || []
        });
        client.sendIq(iq.resultReply());
    });

    client.on('iq:set:unblock', function(iq) {
        client.emit('unblock', {
            jids: iq.unblock.jids || []
        });
        client.sendIq(iq.resultReply());
    });
}
