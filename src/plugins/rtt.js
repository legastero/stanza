import { Namespaces } from '../protocol';


export default function (client) {

    client.disco.addFeature(Namespaces.RTT_0);

    client.on('message', function (msg) {
        if (msg.rtt) {
            client.emit('rtt', msg);
            client.emit('rtt:' + msg.rtt.event, msg);
        }
    });
}
