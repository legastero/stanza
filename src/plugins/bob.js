import { Namespaces } from '../protocol';

export default function (client) {

    client.disco.addFeature(Namespaces.BOB);

    client.getBits = function (jid, cid, cb) {
        return client.sendIq({
            to: jid,
            type: 'get',
            bob: {
                cid: cid
            }
        }, cb);
    };
}
