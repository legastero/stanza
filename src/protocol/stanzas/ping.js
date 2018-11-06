import * as NS from '../namespaces';


export default function (JXT) {

    const Ping = JXT.define({
        name: 'ping',
        namespace: NS.PING,
        element: 'ping'
    });

    JXT.extendIQ(Ping);
}
