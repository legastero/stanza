import * as NS from '../namespaces';

export default function(JXT) {
    const EntityTime = JXT.define({
        element: 'time',
        fields: {
            tzo: JXT.utils.tzoSub(NS.TIME, 'tzo', 0),
            utc: JXT.utils.dateSub(NS.TIME, 'utc')
        },
        name: 'time',
        namespace: NS.TIME
    });

    JXT.extendIQ(EntityTime);
}
