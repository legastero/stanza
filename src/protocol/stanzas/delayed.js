import * as NS from '../namespaces';


export default function (JXT) {

    const Utils = JXT.utils;

    const DelayedDelivery = JXT.define({
        name: 'delay',
        namespace: NS.DELAY,
        element: 'delay',
        fields: {
            from: Utils.jidAttribute('from'),
            stamp: Utils.dateAttribute('stamp'),
            reason: Utils.text()
        }
    });

    JXT.extendMessage(DelayedDelivery);
    JXT.extendPresence(DelayedDelivery);
}
