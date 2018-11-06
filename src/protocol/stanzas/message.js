import * as NS from '../namespaces';

const internals = {};

internals.defineMessage = function(JXT, name, namespace) {
    const Utils = JXT.utils;

    JXT.define({
        name: name,
        namespace: namespace,
        element: 'message',
        topLevel: true,
        fields: {
            lang: Utils.langAttribute(),
            id: Utils.attribute('id'),
            to: Utils.jidAttribute('to', true),
            from: Utils.jidAttribute('from', true),
            type: Utils.attribute('type', 'normal'),
            thread: Utils.textSub(namespace, 'thread'),
            parentThread: Utils.subAttribute(namespace, 'thread', 'parent'),
            subject: Utils.textSub(namespace, 'subject'),
            $body: {
                get: function getBody$() {
                    return Utils.getSubLangText(this.xml, namespace, 'body', this.lang);
                }
            },
            body: {
                get: function getBody() {
                    const bodies = this.$body;
                    return bodies[this.lang] || '';
                },
                set: function setBody(value) {
                    Utils.setSubLangText(this.xml, namespace, 'body', value, this.lang);
                }
            },
            attention: Utils.boolSub(NS.ATTENTION_0, 'attention'),
            chatState: Utils.enumSub(NS.CHAT_STATES, [
                'active',
                'composing',
                'paused',
                'inactive',
                'gone'
            ]),
            replace: Utils.subAttribute(NS.CORRECTION_0, 'replace', 'id'),
            requestReceipt: Utils.boolSub(NS.RECEIPTS, 'request'),
            receipt: Utils.subAttribute(NS.RECEIPTS, 'received', 'id')
        }
    });
};

export default function(JXT) {
    internals.defineMessage(JXT, 'message', NS.CLIENT);
    internals.defineMessage(JXT, 'serverMessage', NS.SERVER);
    internals.defineMessage(JXT, 'componentMessage', NS.COMPONENT);
}
