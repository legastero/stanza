import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Bind = JXT.define({
        name: 'bind',
        namespace: NS.BIND,
        element: 'bind',
        fields: {
            resource: Utils.textSub(NS.BIND, 'resource'),
            jid: Utils.jidSub(NS.BIND, 'jid')
        }
    });

    JXT.extendIQ(Bind);
    JXT.extendStreamFeatures(Bind);
}
