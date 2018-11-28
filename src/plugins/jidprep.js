export default function(client) {
    client.prepJID = function(jid, cb) {
        return client.sendIq(
            {
                jidPrep: jid,
                to: client.jid.domain,
                type: 'get'
            },
            cb
        );
    };
}
