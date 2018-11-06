import { Namespaces } from '../protocol';


export default function (client) {

    client.disco.addFeature(Namespaces.GEOLOC);
    client.disco.addFeature(`${Namespaces.GEOLOC}+notify`);

    client.on('pubsub:event', function (msg) {
        if (!msg.event.updated) {
            return;
        }
        if (msg.event.updated.node !== Namespaces.GEOLOC) {
            return;
        }

        client.emit('geoloc', {
            jid: msg.from,
            geoloc: msg.event.updated.published[0].geoloc
        });
    });

    client.publishGeoLoc = function (data, cb) {
        return this.publish('', Namespaces.GEOLOC, {
            geoloc: data
        }, cb);
    };
}
