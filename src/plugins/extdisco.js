import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.DISCO_EXTERNAL_1);

    client.getServices = function(jid, type, cb) {
        return this.sendIq(
            {
                type: 'get',
                to: jid,
                services: {
                    type: type
                }
            },
            cb
        );
    };

    client.getServiceCredentials = function(jid, host, cb) {
        return this.sendIq(
            {
                type: 'get',
                to: jid,
                credentials: {
                    service: {
                        host: host
                    }
                }
            },
            cb
        );
    };
}
