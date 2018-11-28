import * as NS from '../namespaces';

export default function(JXT) {
    const Hat = JXT.define({
        element: 'hat',
        fields: {
            displayName: JXT.utils.attribute('displayName'),
            lang: JXT.utils.langAttribute(),
            name: JXT.utils.attribute('name')
        },
        name: '_hat',
        namespace: NS.HATS_0
    });

    JXT.withPresence(function(Presence) {
        JXT.add(Presence, 'hats', JXT.utils.subMultiExtension(NS.HATS_0, 'hats', Hat));
    });
}
