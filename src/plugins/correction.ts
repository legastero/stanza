import { Agent } from '../Definitions';
import { NS_CORRECTION_0 } from '../protocol';
import { Message } from '../protocol/stanzas';

export default function(client: Agent) {
    client.disco.addFeature(NS_CORRECTION_0);

    client.on('message', (msg: Message) => {
        if (msg.replace) {
            client.emit('replace', msg);
        }
    });
}
