import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const SMFeature = JXT.define({
        element: 'sm',
        name: 'streamManagement',
        namespace: NS.SMACKS_3
    });

    JXT.define({
        element: 'enable',
        eventName: 'stream:management:enable',
        fields: {
            resume: Utils.boolAttribute('resume')
        },
        name: 'smEnable',
        namespace: NS.SMACKS_3,
        topLevel: true
    });

    JXT.define({
        element: 'enabled',
        eventName: 'stream:management:enabled',
        fields: {
            id: Utils.attribute('id'),
            resume: Utils.boolAttribute('resume')
        },
        name: 'smEnabled',
        namespace: NS.SMACKS_3,
        topLevel: true
    });

    JXT.define({
        element: 'resume',
        eventName: 'stream:management:resume',
        fields: {
            h: Utils.numberAttribute('h', false, 0),
            previd: Utils.attribute('previd')
        },
        name: 'smResume',
        namespace: NS.SMACKS_3,
        topLevel: true
    });

    JXT.define({
        element: 'resumed',
        eventName: 'stream:management:resumed',
        fields: {
            h: Utils.numberAttribute('h', false, 0),
            previd: Utils.attribute('previd')
        },
        name: 'smResumed',
        namespace: NS.SMACKS_3,
        topLevel: true
    });

    JXT.define({
        element: 'failed',
        eventName: 'stream:management:failed',
        name: 'smFailed',
        namespace: NS.SMACKS_3,
        topLevel: true
    });

    JXT.define({
        element: 'a',
        eventName: 'stream:management:ack',
        fields: {
            h: Utils.numberAttribute('h', false, 0)
        },
        name: 'smAck',
        namespace: NS.SMACKS_3,
        topLevel: true
    });

    JXT.define({
        element: 'r',
        eventName: 'stream:management:request',
        name: 'smRequest',
        namespace: NS.SMACKS_3,
        topLevel: true
    });

    JXT.extendStreamFeatures(SMFeature);
}
