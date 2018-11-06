import * as NS from '../namespaces';

export default function(JXT) {
    JXT.withMessage(function(Message) {
        JXT.add(Message, 'markable', JXT.utils.boolSub(NS.CHAT_MARKERS_0, 'markable'));
        JXT.add(Message, 'received', JXT.utils.subAttribute(NS.CHAT_MARKERS_0, 'received', 'id'));
        JXT.add(Message, 'displayed', JXT.utils.subAttribute(NS.CHAT_MARKERS_0, 'displayed', 'id'));
        JXT.add(
            Message,
            'acknowledged',
            JXT.utils.subAttribute(NS.CHAT_MARKERS_0, 'acknowledged', 'id')
        );
    });
}
