import { Namespaces } from '../protocol';


export default function (client) {

    client.disco.addFeature(Namespaces.TUNE);
    client.disco.addFeature(Namespaces.PEP_NOTIFY(Namespaces.TUNE));

    client.on('pubsub:event', function (msg) {
        if (!msg.event.updated) {
            return;
        }

        if (msg.event.updated.node !== Namespaces.TUNE) {
            return;
        }

        client.emit('tune', {
            jid: msg.from,
            tune: msg.event.updated.published[0].tune
        });
    });

    client.publishTune = function (tune, cb) {
        return this.publish('', Namespaces.TUNE, {
            tune: tune
        }, cb);
    };
}
