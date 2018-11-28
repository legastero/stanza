import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.PING);

    client.on('iq:get:ping', function(iq) {
        client.sendIq(iq.resultReply());
    });

    client.ping = function(jid, cb) {
        return this.sendIq(
            {
                ping: true,
                to: jid,
                type: 'get'
            },
            cb
        );
    };
}
