import * as NS from '../namespaces';


export default function (JXT) {

    JXT.withMessage(function (Message) {

        JXT.add(Message, 'markable', JXT.utils.boolSub(NS.CHAT_MARKERS, 'markable'));
        JXT.add(Message, 'received', JXT.utils.subAttribute(NS.CHAT_MARKERS, 'received', 'id'));
        JXT.add(Message, 'displayed', JXT.utils.subAttribute(NS.CHAT_MARKERS, 'displayed', 'id'));
        JXT.add(Message, 'acknowledged', JXT.utils.subAttribute(NS.CHAT_MARKERS, 'acknowledged', 'id'));
    });
}
