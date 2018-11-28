import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Services = JXT.define({
        element: 'services',
        fields: {
            type: Utils.attribute('type')
        },
        name: 'services',
        namespace: NS.DISCO_EXTERNAL_1
    });

    const Credentials = JXT.define({
        element: 'credentials',
        name: 'credentials',
        namespace: NS.DISCO_EXTERNAL_1
    });

    const Service = JXT.define({
        element: 'service',
        fields: {
            host: Utils.attribute('host'),
            password: Utils.attribute('password'),
            port: Utils.attribute('port'),
            transport: Utils.attribute('transport'),
            type: Utils.attribute('type'),
            username: Utils.attribute('username')
        },
        name: 'service',
        namespace: NS.DISCO_EXTERNAL_1
    });

    JXT.extend(Services, Service, 'services');
    JXT.extend(Credentials, Service);

    JXT.extendIQ(Services);
    JXT.extendIQ(Credentials);

    JXT.withDataForm(function(DataForm) {
        JXT.extend(Service, DataForm);
    });
}
