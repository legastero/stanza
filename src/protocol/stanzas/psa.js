import * as NS from '../namespaces';

const CONDITIONS = ['server-unavailable', 'connection-paused'];

export default function(JXT) {
    const PSA = JXT.define({
        element: 'state-annotation',
        fields: {
            condition: JXT.utils.enumSub(NS.PSA, CONDITIONS),
            description: JXT.utils.textSub(NS.PSA, 'description'),
            from: JXT.utils.jidAttribute('from')
        },
        name: 'state',
        namespace: NS.PSA
    });

    JXT.extendPresence(PSA);
}
