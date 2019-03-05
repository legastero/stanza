import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Request = JXT.define({
        element: 'request',
        fields: {
            filename: Utils.attribute('filename'),
            size: Utils.numberAttribute('size'),
            type: Utils.attribute('content-type')
        },
        name: 'uploadRequest',
        namespace: NS.HTTP_UPLOAD_0
    });

    const Slot = JXT.define({
        element: 'slot',
        name: 'uploadSlots',
        namespace: NS.HTTP_UPLOAD_0
    });

    const Put = JXT.define({
        element: 'put',
        fields: {
            url: Utils.attribute('url')
        },
        name: 'put',
        namespace: NS.HTTP_UPLOAD_0
    });

    const Header = JXT.define({
        element: 'header',
        fields: {
            name: Utils.attribute('name'),
            value: Utils.text()
        },
        name: '_header',
        namespace: NS.HTTP_UPLOAD_0
    });

    const Get = JXT.define({
        element: 'get',
        fields: {
            url: Utils.attribute('url')
        },
        name: 'get',
        namespace: NS.HTTP_UPLOAD_0
    });

    JXT.extend(Put, Header, 'headers');

    JXT.extend(Slot, Put);
    JXT.extend(Slot, Get);

    JXT.extendIQ(Slot);
    JXT.extendIQ(Request);
}
