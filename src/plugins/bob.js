import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.BOB);

    client.getBits = function(jid, cid, cb) {
        return client.sendIq(
            {
                bob: {
                    cid: cid
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };
}
