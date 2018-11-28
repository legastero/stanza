import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const EncryptionMethod = JXT.define({
        element: 'encryption',
        fields: {
            name: Utils.attribute('name'),
            namespace: Utils.attribute('namespace')
        },
        name: 'encryptionMethod',
        namespace: NS.EME_0
    });

    JXT.extendMessage(EncryptionMethod);
}
