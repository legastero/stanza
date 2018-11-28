import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const BOB = JXT.define({
        element: 'data',
        fields: {
            cid: Utils.attribute('cid'),
            data: Utils.text(),
            maxAge: Utils.numberAttribute('max-age'),
            type: Utils.attribute('type')
        },
        name: 'bob',
        namespace: NS.BOB
    });

    JXT.extendIQ(BOB);
    JXT.extendMessage(BOB);
    JXT.extendPresence(BOB);
}
