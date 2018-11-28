import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const DelayedDelivery = JXT.define({
        element: 'delay',
        fields: {
            from: Utils.jidAttribute('from'),
            reason: Utils.text(),
            stamp: Utils.dateAttribute('stamp')
        },
        name: 'delay',
        namespace: NS.DELAY
    });

    JXT.extendMessage(DelayedDelivery);
    JXT.extendPresence(DelayedDelivery);
}
