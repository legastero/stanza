import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.PUSH_0);

    client.enableNotifications = function(jid, node, fieldList, cb) {
        const fields = [
            {
                name: 'FORM_TYPE',
                value: 'http://jabber.org/protocol/pubsub#publish-options'
            }
        ];
        const iq = {
            enablePush: {
                jid: jid,
                node: node
            },
            type: 'set'
        };
        if (fieldList && fieldList.length) {
            iq.enablePush.form = {
                fields: fields.concat(fieldList),
                type: 'submit'
            };
        }
        return this.sendIq(iq, cb);
    };

    client.disableNotifications = function(jid, node, cb) {
        const iq = {
            disablePush: {
                jid: jid
            },
            type: 'set'
        };
        if (node) {
            iq.disablePush.node = node;
        }
        return this.sendIq(iq, cb);
    };
}
