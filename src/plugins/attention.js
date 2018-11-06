import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.ATTENTION_0);

    client.getAttention = function(jid, opts) {
        opts = opts || {};
        opts.to = jid;
        opts.type = 'headline';
        opts.attention = true;
        client.sendMessage(opts);
    };

    client.on('message', function(msg) {
        if (msg.attention) {
            client.emit('attention', msg);
        }
    });
}
