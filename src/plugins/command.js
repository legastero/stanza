import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.ADHOC_COMMANDS);
    client.disco.addItem({
        name: 'Ad-Hoc Commands',
        node: Namespaces.ADHOC_COMMANDS
    });

    client.getCommands = function(jid, cb) {
        return client.getDiscoItems(jid, Namespaces.ADHOC_COMMANDS, cb);
    };
}
