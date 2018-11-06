import * as NS from '../namespaces';

export default function(JXT) {
    JXT.define({
        name: 'streamFeatures',
        namespace: NS.STREAM,
        element: 'features',
        topLevel: true
    });

    const RosterVerFeature = JXT.define({
        name: 'rosterVersioning',
        namespace: NS.ROSTER_VERSIONING,
        element: 'ver'
    });

    const SubscriptionPreApprovalFeature = JXT.define({
        name: 'subscriptionPreApproval',
        namespace: NS.SUBSCRIPTION_PREAPPROVAL,
        element: 'sub'
    });

    JXT.extendStreamFeatures(RosterVerFeature);
    JXT.extendStreamFeatures(SubscriptionPreApprovalFeature);
}
