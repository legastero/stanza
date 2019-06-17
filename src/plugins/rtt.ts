import { Agent } from '../';
import { NS_RTT_0 } from '../Namespaces';
import { Message, RTT } from '../protocol';

export type RTTMessage = Message & { rtt: RTT };

declare module '../' {
    export interface AgentEvents {
        rtt: RTTMessage;
    }
}

function hasRTT(msg: Message): msg is RTTMessage {
    return !!msg.rtt;
}

export default function(client: Agent) {
    client.disco.addFeature(NS_RTT_0);

    client.on('message', (msg: Message) => {
        if (hasRTT(msg)) {
            client.emit('rtt', msg);
        }
    });
}
