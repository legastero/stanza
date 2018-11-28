import * as NS from '../namespaces';

export default function(JXT) {
    const OOB = JXT.define({
        element: 'x',
        fields: {
            desc: JXT.utils.textSub(NS.OOB, 'desc'),
            url: JXT.utils.textSub(NS.OOB, 'url')
        },
        name: 'oob',
        namespace: NS.OOB
    });

    const OOB_IQ = JXT.define({
        element: 'query',
        fields: {
            desc: JXT.utils.textSub(NS.OOB, 'desc'),
            url: JXT.utils.textSub(NS.OOB, 'url')
        },
        name: 'oob',
        namespace: NS.OOB_IQ
    });

    JXT.extendMessage(OOB, 'oobURIs');
    JXT.extendIQ(OOB_IQ);
}
