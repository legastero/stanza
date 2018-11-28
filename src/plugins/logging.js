import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature('', Namespaces.EVENTLOG);

    client.sendLog = function(jid, logData) {
        client.sendMessage({
            log: logData,
            to: jid,
            type: 'normal'
        });
    };
}
