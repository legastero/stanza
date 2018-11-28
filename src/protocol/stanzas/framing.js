import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    JXT.define({
        element: 'open',
        fields: {
            from: Utils.jidAttribute('from', true),
            id: Utils.attribute('id'),
            lang: Utils.langAttribute(),
            to: Utils.jidAttribute('to', true),
            version: Utils.attribute('version', '1.0')
        },
        name: 'openStream',
        namespace: NS.FRAMING,
        topLevel: true
    });

    JXT.define({
        element: 'close',
        fields: {
            seeOtherURI: Utils.attribute('see-other-uri')
        },
        name: 'closeStream',
        namespace: NS.FRAMING,
        topLevel: true
    });
}
