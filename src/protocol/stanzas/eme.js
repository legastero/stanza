import * as NS from '../namespaces';


export default function (JXT) {
    const Utils = JXT.utils;

    const EncryptionMethod = JXT.define({
        name: 'encryptionMethod',
        element: 'encryption',
        namespace: NS.EME_0,
        fields: {
            name: Utils.attribute('name'),
            namespace: Utils.attribute('namespace'),
        }
    });
    
    JXT.extendMessage(EncryptionMethod);
}
