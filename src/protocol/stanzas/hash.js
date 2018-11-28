import * as NS from '../namespaces';

export default function(JXT) {
    JXT.define({
        element: 'hash',
        fields: {
            algo: JXT.utils.attribute('algo'),
            value: JXT.utils.text()
        },
        name: 'hash',
        namespace: NS.HASHES_1
    });
}
