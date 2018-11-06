import * as NS from '../namespaces';


export default function (JXT) {

    const Session = JXT.define({
        name: 'session',
        namespace: NS.SESSION,
        element: 'session',
        fields: {
            required: JXT.utils.boolSub(NS.SESSION, 'required'),
            optional: JXT.utils.boolSub(NS.SESSION, 'optional')
        }
    });


    JXT.extendIQ(Session);
    JXT.extendStreamFeatures(Session);
}
