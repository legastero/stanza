import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.TIME);

    client.getTime = function(jid, cb) {
        return this.sendIq(
            {
                to: jid,
                type: 'get',
                time: true
            },
            cb
        );
    };

    client.on('iq:get:time', function(iq) {
        const time = new Date();
        client.sendIq(
            iq.resultReply({
                time: {
                    utc: time,
                    tzo: time.getTimezoneOffset()
                }
            })
        );
    });
}
