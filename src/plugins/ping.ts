import { Agent } from '../';
import { NS_PING } from '../Namespaces';
import { IQ } from '../protocol';

declare module '../' {
    export interface Agent {
        ping(jid?: string): Promise<void>;
    }

    export interface AgentEvents {
        'iq:get:ping': IQ & { ping: boolean };
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_PING);

    client.on('iq:get:ping', iq => {
        client.sendIQResult(iq);
    });

    client.ping = async (jid?: string) => {
        await client.sendIQ({
            ping: true,
            to: jid,
            type: 'get'
        });
    };
}
