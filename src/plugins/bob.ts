import { Agent } from '../';
import { Bits, IQ, NS_BOB } from '../protocol';

declare module '../' {
    export interface Agent {
        getBits(jid: string, cid: string): Promise<Bits>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_BOB);

    client.getBits = async (jid, cid) => {
        const result = await client.sendIQ({
            bits: {
                cid
            } as Bits,
            to: jid,
            type: 'get'
        });

        return result.bits;
    };
}
