import { Agent } from '../';
import { IQ, NS_BOB } from '../protocol';

declare module '../' {
    export interface Agent {
        getBits(jid: string, cid: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_BOB);

    client.getBits = (jid, cid) => {
        return client.sendIQ({
            bits: {
                cid
            },
            to: jid,
            type: 'get'
        });
    };
}
