import { Agent } from '../Definitions';
import { NS_BOB } from '../protocol';
import { IQ } from '../protocol/stanzas';

declare module '../Definitions' {
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
