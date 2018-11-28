import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Reference = JXT.define({
        element: 'reference',
        fields: {
            anchor: Utils.attribute('anchor'),
            begin: Utils.numberAttribute('begin'),
            end: Utils.numberAttribute('end'),
            type: Utils.attribute('type'),
            uri: Utils.attribute('uri')
        },
        name: 'reference',
        namespace: NS.REFERENCE_0
    });

    const References = Utils.multiExtension(Reference);

    JXT.withMessage(function(Message) {
        JXT.add(Message, 'references', References);
    });
}
