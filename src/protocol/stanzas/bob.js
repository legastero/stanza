import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const BOB = JXT.define({
        name: 'bob',
        namespace: NS.BOB,
        element: 'data',
        fields: {
            cid: Utils.attribute('cid'),
            maxAge: Utils.numberAttribute('max-age'),
            type: Utils.attribute('type'),
            data: Utils.text()
        }
    });

    JXT.extendIQ(BOB);
    JXT.extendMessage(BOB);
    JXT.extendPresence(BOB);
}
