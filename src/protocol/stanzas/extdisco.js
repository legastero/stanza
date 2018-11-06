import * as NS from '../namespaces';


export default function (JXT) {

    const Utils = JXT.utils;

    const Services = JXT.define({
        name: 'services',
        namespace: NS.DISCO_EXTERNAL_1,
        element: 'services',
        fields: {
            type: Utils.attribute('type')
        }
    });

    const Credentials = JXT.define({
        name: 'credentials',
        namespace: NS.DISCO_EXTERNAL_1,
        element: 'credentials'
    });

    const Service = JXT.define({
        name: 'service',
        namespace: NS.DISCO_EXTERNAL_1,
        element: 'service',
        fields: {
            host: Utils.attribute('host'),
            port: Utils.attribute('port'),
            transport: Utils.attribute('transport'),
            type: Utils.attribute('type'),
            username: Utils.attribute('username'),
            password: Utils.attribute('password')
        }
    });


    JXT.extend(Services, Service, 'services');
    JXT.extend(Credentials, Service);

    JXT.extendIQ(Services);
    JXT.extendIQ(Credentials);

    JXT.withDataForm(function (DataForm) {

        JXT.extend(Service, DataForm);
    });
}
