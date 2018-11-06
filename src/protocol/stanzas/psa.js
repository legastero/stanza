import * as NS from '../namespaces';


const CONDITIONS = [
    'server-unavailable',
    'connection-paused'
];


export default function (JXT) {

    const PSA = JXT.define({
        name: 'state',
        namespace: NS.PSA,
        element: 'state-annotation',
        fields: {
            from: JXT.utils.jidAttribute('from'),
            condition: JXT.utils.enumSub(NS.PSA, CONDITIONS),
            description: JXT.utils.textSub(NS.PSA, 'description')
        }
    });


    JXT.extendPresence(PSA);
}
