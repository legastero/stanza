import * as NS from '../namespaces';

export default function(JXT) {
    JXT.define({
        element: 'features',
        name: 'streamFeatures',
        namespace: NS.STREAM,
        topLevel: true
    });

    const RosterVerFeature = JXT.define({
        element: 'ver',
        name: 'rosterVersioning',
        namespace: NS.ROSTER_VERSIONING
    });

    const SubscriptionPreApprovalFeature = JXT.define({
        element: 'sub',
        name: 'subscriptionPreApproval',
        namespace: NS.SUBSCRIPTION_PREAPPROVAL
    });

    JXT.extendStreamFeatures(RosterVerFeature);
    JXT.extendStreamFeatures(SubscriptionPreApprovalFeature);
}
