import * as NS from '../namespaces';

export default function(JXT) {
    const OOB = JXT.define({
        name: 'oob',
        element: 'x',
        namespace: NS.OOB,
        fields: {
            url: JXT.utils.textSub(NS.OOB, 'url'),
            desc: JXT.utils.textSub(NS.OOB, 'desc')
        }
    });

    const OOB_IQ = JXT.define({
        name: 'oob',
        element: 'query',
        namespace: NS.OOB_IQ,
        fields: {
            url: JXT.utils.textSub(NS.OOB, 'url'),
            desc: JXT.utils.textSub(NS.OOB, 'desc')
        }
    });

    JXT.extendMessage(OOB, 'oobURIs');
    JXT.extendIQ(OOB_IQ);
}
