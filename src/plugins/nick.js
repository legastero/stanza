import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.NICK);
    client.disco.addFeature(Namespaces.PEP_NOTIFY(Namespaces.NICK));

    client.on('pubsub:event', function(msg) {
        if (!msg.event.updated) {
            return;
        }
        if (msg.event.updated.node !== Namespaces.NICK) {
            return;
        }

        client.emit('nick', {
            jid: msg.from,
            nick: msg.event.updated.published[0].nick
        });
    });

    client.publishNick = function(nick, cb) {
        return this.publish(
            '',
            Namespaces.NICK,
            {
                nick: nick
            },
            cb
        );
    };
}
