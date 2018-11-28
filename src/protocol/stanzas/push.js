import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Enable = JXT.define({
        element: 'enable',
        fields: {
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node')
        },
        name: 'enablePush',
        namespace: NS.PUSH_0
    });

    const Disable = JXT.define({
        element: 'disable',
        fields: {
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node')
        },
        name: 'disablePush',
        namespace: NS.PUSH_0
    });

    const Notification = JXT.define({
        element: 'notification',
        name: 'pushNotification',
        namespace: NS.PUSH_0
    });

    JXT.withDataForm(DataForm => {
        JXT.extend(Notification, DataForm);
        JXT.extend(Enable, DataForm);
    });

    JXT.extendIQ(Enable);
    JXT.extendIQ(Disable);
}
