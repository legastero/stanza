import { Namespaces } from '../protocol';

export default function (client) {

    client.disco.addFeature(Namespaces.CORRECTION_0);

    client.on('message', function (msg) {
        if (msg.replace) {
            client.emit('replace', msg);
            client.emit('replace:' + msg.id, msg);
        }
    });
}
