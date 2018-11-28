import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.TIME);

    client.getTime = function(jid, cb) {
        return this.sendIq(
            {
                time: true,
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.on('iq:get:time', function(iq) {
        const time = new Date();
        client.sendIq(
            iq.resultReply({
                time: {
                    tzo: time.getTimezoneOffset(),
                    utc: time
                }
            })
        );
    });
}
