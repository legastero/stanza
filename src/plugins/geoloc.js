import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.GEOLOC);
    client.disco.addFeature(Namespaces.PEP_NOTIFY(Namespaces.GEOLOC));

    client.on('pubsub:event', function(msg) {
        if (!msg.event.updated) {
            return;
        }
        if (msg.event.updated.node !== Namespaces.GEOLOC) {
            return;
        }

        client.emit('geoloc', {
            geoloc: msg.event.updated.published[0].geoloc,
            jid: msg.from
        });
    });

    client.publishGeoLoc = function(data, cb) {
        return this.publish(
            '',
            Namespaces.GEOLOC,
            {
                geoloc: data
            },
            cb
        );
    };
}
