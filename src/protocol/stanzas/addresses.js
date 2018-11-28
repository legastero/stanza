import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Address = JXT.define({
        element: 'address',
        fields: {
            delivered: Utils.boolAttribute('delivered'),
            description: Utils.attribute('desc'),
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node'),
            type: Utils.attribute('type'),
            uri: Utils.attribute('uri')
        },
        name: '_address',
        namespace: NS.ADDRESS
    });

    const Addresses = Utils.subMultiExtension(NS.ADDRESS, 'addresses', Address);

    JXT.withMessage(function(Message) {
        JXT.add(Message, 'addresses', Addresses);
    });

    JXT.withPresence(function(Presence) {
        JXT.add(Presence, 'addresses', Addresses);
    });
}
