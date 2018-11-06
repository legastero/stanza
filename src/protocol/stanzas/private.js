import * as NS from '../namespaces';


export default function (JXT) {

    const PrivateStorage = JXT.define({
        name: 'privateStorage',
        namespace: NS.PRIVATE,
        element: 'query'
    });

    JXT.extendIQ(PrivateStorage);
}
