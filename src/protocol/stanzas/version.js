import * as NS from '../namespaces';

export default function(JXT) {
    const Version = JXT.define({
        element: 'query',
        fields: {
            name: JXT.utils.textSub(NS.VERSION, 'name'),
            os: JXT.utils.textSub(NS.VERSION, 'os'),
            version: JXT.utils.textSub(NS.VERSION, 'version')
        },
        name: 'version',
        namespace: NS.VERSION
    });

    JXT.extendIQ(Version);
}
