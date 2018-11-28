import * as NS from '../namespaces';

export default function(JXT) {
    const Session = JXT.define({
        element: 'session',
        fields: {
            optional: JXT.utils.boolSub(NS.SESSION, 'optional'),
            required: JXT.utils.boolSub(NS.SESSION, 'required')
        },
        name: 'session',
        namespace: NS.SESSION
    });

    JXT.extendIQ(Session);
    JXT.extendStreamFeatures(Session);
}
