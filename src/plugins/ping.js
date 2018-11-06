import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.PING);

    client.on('iq:get:ping', function(iq) {
        client.sendIq(iq.resultReply());
    });

    client.ping = function(jid, cb) {
        return this.sendIq(
            {
                to: jid,
                type: 'get',
                ping: true
            },
            cb
        );
    };
}
