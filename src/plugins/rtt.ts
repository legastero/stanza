import { Agent } from '../Definitions';
import { NS_RTT_0 } from '../protocol';
import { Message } from '../protocol';

export default function(client: Agent) {
    client.disco.addFeature(NS_RTT_0);

    client.on('message', (msg: Message) => {
        if (msg.rtt) {
            client.emit('rtt', msg);
        }
    });
}
