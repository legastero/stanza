import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Bind = JXT.define({
        element: 'bind',
        fields: {
            jid: Utils.jidSub(NS.BIND, 'jid'),
            resource: Utils.textSub(NS.BIND, 'resource')
        },
        name: 'bind',
        namespace: NS.BIND
    });

    JXT.extendIQ(Bind);
    JXT.extendStreamFeatures(Bind);
}
