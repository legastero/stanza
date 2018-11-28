import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.MOOD);
    client.disco.addFeature(Namespaces.PEP_NOTIFY(Namespaces.MOOD));

    client.on('pubsub:event', function(msg) {
        if (!msg.event.updated) {
            return;
        }

        if (msg.event.updated.node !== Namespaces.MOOD) {
            return;
        }

        client.emit('mood', {
            jid: msg.from,
            mood: msg.event.updated.published[0].mood
        });
    });

    client.publishMood = function(mood, text, cb) {
        return this.publish(
            '',
            Namespaces.MOOD,
            {
                mood: {
                    text: text,
                    value: mood
                }
            },
            cb
        );
    };
}
