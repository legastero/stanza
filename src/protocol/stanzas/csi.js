import * as NS from '../namespaces';

export default function(JXT) {
    const CSIFeature = JXT.define({
        element: 'csi',
        name: 'clientStateIndication',
        namespace: NS.CSI
    });

    JXT.define({
        element: 'active',
        eventName: 'csi:active',
        name: 'csiActive',
        namespace: NS.CSI,
        topLevel: true
    });

    JXT.define({
        element: 'inactive',
        eventName: 'csi:inactive',
        name: 'csiInactive',
        namespace: NS.CSI,
        topLevel: true
    });

    JXT.extendStreamFeatures(CSIFeature);
}
