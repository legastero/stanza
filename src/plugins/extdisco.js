import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.DISCO_EXTERNAL_1);

    client.getServices = function(jid, type, cb) {
        return this.sendIq(
            {
                services: {
                    type: type
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.getServiceCredentials = function(jid, host, cb) {
        return this.sendIq(
            {
                credentials: {
                    service: {
                        host: host
                    }
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };
}
