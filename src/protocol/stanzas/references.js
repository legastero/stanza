import * as NS from '../namespaces';

export default function (JXT) {

    const Utils = JXT.utils;

    const Reference = JXT.define({
        name: 'reference',
        element: 'reference',
        namespace: NS.REFERENCE_0,
        fields: {
            type: Utils.attribute('type'),
            begin: Utils.numberAttribute('begin'),
            end: Utils.numberAttribute('end'),
            uri: Utils.attribute('uri'),
            anchor: Utils.attribute('anchor')
        }
    });

    const References = Utils.multiExtension(Reference);

    JXT.withMessage(function (Message) {

        JXT.add(Message, 'references', References);
    });
}
