import { Agent } from '../Definitions';
import { NS_PING } from '../protocol';
import { IQ } from '../protocol';

declare module '../Definitions' {
    export interface Agent {
        ping(jid?: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_PING);

    client.on('iq:get:ping', (iq: IQ) => {
        client.sendIQResult(iq);
    });

    client.ping = (jid: string) => {
        return client.sendIQ({
            ping: true,
            to: jid,
            type: 'get'
        });
    };
}
