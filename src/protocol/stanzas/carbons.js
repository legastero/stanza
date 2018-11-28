import * as NS from '../namespaces';

export default function(JXT) {
    const Sent = JXT.define({
        element: 'sent',
        eventName: 'carbon:sent',
        name: 'carbonSent',
        namespace: NS.CARBONS_2
    });

    const Received = JXT.define({
        element: 'received',
        eventName: 'carbon:received',
        name: 'carbonReceived',
        namespace: NS.CARBONS_2
    });

    const Private = JXT.define({
        element: 'private',
        eventName: 'carbon:private',
        name: 'carbonPrivate',
        namespace: NS.CARBONS_2
    });

    const Enable = JXT.define({
        element: 'enable',
        name: 'enableCarbons',
        namespace: NS.CARBONS_2
    });

    const Disable = JXT.define({
        element: 'disable',
        name: 'disableCarbons',
        namespace: NS.CARBONS_2
    });

    JXT.withDefinition('forwarded', NS.FORWARD_0, function(Forwarded) {
        JXT.extend(Sent, Forwarded);
        JXT.extend(Received, Forwarded);
    });

    JXT.extendMessage(Sent);
    JXT.extendMessage(Received);
    JXT.extendMessage(Private);
    JXT.extendIQ(Enable);
    JXT.extendIQ(Disable);
}
