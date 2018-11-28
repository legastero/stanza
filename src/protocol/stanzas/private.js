import * as NS from '../namespaces';

export default function(JXT) {
    const PrivateStorage = JXT.define({
        element: 'query',
        name: 'privateStorage',
        namespace: NS.PRIVATE
    });

    JXT.extendIQ(PrivateStorage);
}
