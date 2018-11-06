'use strict';

export default function (client) {

    client.disco.addFeature('urn:xmpp:push:0');

    client.enableNotifications = function(jid, node, fieldList, cb) {
        const fields = [{
            name: 'FORM_TYPE',
            value: 'http://jabber.org/protocol/pubsub#publish-options'
        }];
        const iq = {
            type: 'set',
            enablePush: {
                jid: jid,
                node: node,
            }
        };
        if (fieldList && fieldList.length) {
            iq.enablePush.form = {
                fields: fields.concat(fieldList)
            };
        }
        return this.sendIq(iq, cb);
    };

    client.disableNotifications = function(jid, node, cb) {
        const iq = {
            type: 'set',
            disablePush: {
                jid: jid
            }
        };
        if (node) {
            iq.disablePush.node = node;
        }
        return this.sendIq(iq, cb);
    };
}
