import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    JXT.define({
        element: 'stream',
        fields: {
            from: Utils.jidAttribute('from', true),
            id: Utils.attribute('id'),
            lang: Utils.langAttribute(),
            to: Utils.jidAttribute('to', true),
            version: Utils.attribute('version', '1.0')
        },
        name: 'stream',
        namespace: NS.STREAM
    });
}
