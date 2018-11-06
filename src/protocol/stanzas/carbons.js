import * as NS from '../namespaces';

export default function(JXT) {
    const Sent = JXT.define({
        name: 'carbonSent',
        eventName: 'carbon:sent',
        namespace: NS.CARBONS_2,
        element: 'sent'
    });

    const Received = JXT.define({
        name: 'carbonReceived',
        eventName: 'carbon:received',
        namespace: NS.CARBONS_2,
        element: 'received'
    });

    const Private = JXT.define({
        name: 'carbonPrivate',
        eventName: 'carbon:private',
        namespace: NS.CARBONS_2,
        element: 'private'
    });

    const Enable = JXT.define({
        name: 'enableCarbons',
        namespace: NS.CARBONS_2,
        element: 'enable'
    });

    const Disable = JXT.define({
        name: 'disableCarbons',
        namespace: NS.CARBONS_2,
        element: 'disable'
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
