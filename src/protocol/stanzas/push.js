import * as NS from '../namespaces';


export default function (JXT) {

    const Utils = JXT.utils;

    const Enable = JXT.define({
        name: 'enablePush',
        element: 'enable',
        namespace: NS.PUSH_0,
        fields: {
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node')
        }
    });

    const Disable = JXT.define({
        name: 'disablePush',
        element: 'disable',
        namespace: NS.PUSH_0,
        fields: {
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node')
        }
    });

    const Notification = JXT.define({
        name: 'pushNotification',
        element: 'notification',
        namespace: NS.PUSH_0
    });


    JXT.withDataForm((DataForm) => {
        JXT.extend(Notification, DataForm);
        JXT.extend(Enable, DataForm);
    });

    JXT.extendIQ(Enable);
    JXT.extendIQ(Disable);
}
