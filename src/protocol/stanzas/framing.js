import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    JXT.define({
        name: 'openStream',
        namespace: NS.FRAMING,
        element: 'open',
        topLevel: true,
        fields: {
            lang: Utils.langAttribute(),
            id: Utils.attribute('id'),
            version: Utils.attribute('version', '1.0'),
            to: Utils.jidAttribute('to', true),
            from: Utils.jidAttribute('from', true)
        }
    });

    JXT.define({
        name: 'closeStream',
        namespace: NS.FRAMING,
        element: 'close',
        topLevel: true,
        fields: {
            seeOtherURI: Utils.attribute('see-other-uri')
        }
    });
}
