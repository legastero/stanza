import * as NS from '../namespaces';

export default function(JXT) {
    const Ping = JXT.define({
        element: 'ping',
        name: 'ping',
        namespace: NS.PING
    });

    JXT.extendIQ(Ping);
}
