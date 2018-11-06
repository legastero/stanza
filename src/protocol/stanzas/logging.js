import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Log = JXT.define({
        name: 'log',
        namespace: NS.EVENTLOG,
        element: 'log',
        fields: {
            id: Utils.attribute('id'),
            timestamp: Utils.dateAttribute('timestamp'),
            type: Utils.attribute('type'),
            level: Utils.attribute('level'),
            object: Utils.attribute('object'),
            subject: Utils.attribute('subject'),
            facility: Utils.attribute('facility'),
            module: Utils.attribute('module'),
            message: Utils.textSub(NS.EVENTLOG, 'message'),
            stackTrace: Utils.textSub(NS.EVENTLOG, 'stackTrace')
        }
    });

    const Tag = JXT.define({
        name: '_logtag',
        namespace: NS.EVENTLOG,
        element: 'tag',
        fields: {
            name: Utils.attribute('name'),
            value: Utils.attribute('value'),
            type: Utils.attribute('type')
        }
    });

    JXT.extend(Log, Tag, 'tags');

    JXT.extendMessage(Log);
    JXT.extendPubsubItem(Log);
}
