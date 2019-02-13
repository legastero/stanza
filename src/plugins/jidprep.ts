import { Agent } from '../Definitions';

declare module '../Definitions' {
    export interface Agent {
        prepJID(jid: string): Promise<string>;
    }
}

export default function(client: Agent) {
    client.prepJID = async (jid: string): Promise<string> => {
        const resp = await client.sendIQ({
            jidPrep: jid,
            type: 'get'
        });

        return resp.jidPrep!;
    };
}
