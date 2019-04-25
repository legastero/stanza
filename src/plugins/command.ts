import { Agent } from '../Definitions';
import { NS_ADHOC_COMMANDS } from '../protocol';
import { IQ } from '../protocol';

declare module '../Definitions' {
    export interface Agent {
        getCommands(jid?: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_ADHOC_COMMANDS);
    client.disco.addItem({
        name: 'Ad-Hoc Commands',
        node: NS_ADHOC_COMMANDS
    });

    client.getCommands = (jid?: string) => {
        return client.getDiscoItems(jid, NS_ADHOC_COMMANDS);
    };
}
