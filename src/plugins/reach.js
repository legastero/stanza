import { Namespaces } from '../protocol';


export default function (client) {

    client.disco.addFeature(Namespaces.REACH_0);
    client.disco.addFeature(`${Namespaces.REACH_0}+notify`);

    client.on('pubsub:event', function (msg) {
        if (!msg.event.updated) {
            return;
        }
        if (msg.event.updated.node !== Namespaces.REACH_0) {
            return;
        }

        client.emit('reachability', {
            jid: msg.from,
            addresses: msg.event.updated.published[0].reach
        });
    });

    client.on('presence', function (pres) {
        if (!pres.reach || !pres.reach.length) {
            return;
        }

        client.emit('reachability', {
            jid: pres.from,
            addresses: pres.reach
        });
    });

    client.publishReachability = function (data, cb) {
        return this.publish('', Namespaces.REACH_0, {
            reach: data
        }, cb);
    };
}
