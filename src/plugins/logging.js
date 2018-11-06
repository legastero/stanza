import { Namespaces } from '../protocol';


export default function (client) {

    client.disco.addFeature('', Namespaces.EVENTLOG);

    client.sendLog = function (jid, logData) {
        client.sendMessage({
            to: jid,
            type: 'normal',
            log: logData
        });
    };
}
