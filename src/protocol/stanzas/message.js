import * as NS from '../namespaces';

const internals = {};

internals.defineMessage = function(JXT, name, namespace) {
    const Utils = JXT.utils;

    JXT.define({
        element: 'message',
        fields: {
            $body: {
                get: function getBody$() {
                    return Utils.getSubLangText(this.xml, namespace, 'body', this.lang);
                }
            },
            attention: Utils.boolSub(NS.ATTENTION_0, 'attention'),
            body: {
                get: function getBody() {
                    const bodies = this.$body;
                    return bodies[this.lang] || '';
                },
                set: function setBody(value) {
                    Utils.setSubLangText(this.xml, namespace, 'body', value, this.lang);
                }
            },
            chatState: Utils.enumSub(NS.CHAT_STATES, [
                'active',
                'composing',
                'paused',
                'inactive',
                'gone'
            ]),
            from: Utils.jidAttribute('from', true),
            id: Utils.attribute('id'),
            lang: Utils.langAttribute(),
            parentThread: Utils.subAttribute(namespace, 'thread', 'parent'),
            receipt: Utils.subAttribute(NS.RECEIPTS, 'received', 'id'),
            replace: Utils.subAttribute(NS.CORRECTION_0, 'replace', 'id'),
            requestReceipt: Utils.boolSub(NS.RECEIPTS, 'request'),
            subject: Utils.textSub(namespace, 'subject'),
            thread: Utils.textSub(namespace, 'thread'),
            to: Utils.jidAttribute('to', true),
            type: Utils.attribute('type', 'normal')
        },
        name: name,
        namespace: namespace,
        topLevel: true
    });
};

export default function(JXT) {
    internals.defineMessage(JXT, 'message', NS.CLIENT);
    internals.defineMessage(JXT, 'serverMessage', NS.SERVER);
    internals.defineMessage(JXT, 'componentMessage', NS.COMPONENT);
}
