import { Agent } from '../';
import { NS_ADHOC_COMMANDS } from '../Namespaces';
import { IQ } from '../protocol';

declare module '../' {
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
