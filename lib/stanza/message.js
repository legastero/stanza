'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    stanza.define({
        name: 'message',
        namespace: 'jabber:client',
        element: 'message',
        topLevel: true,
        fields: {
            lang: types.langAttribute(),
            id: types.attribute('id'),
            to: types.jidAttribute('to', true),
            from: types.jidAttribute('from', true),
            type: types.attribute('type', 'normal'),
            thread: types.textSub('jabber:client', 'thread'),
            parentThread: types.subAttribute('jabber:client', 'thread', 'parent'),
            subject: types.textSub('jabber:client', 'subject'),
            $body: {
                get: function () {
                    return types.getSubLangText(this.xml, this._NS, 'body', this.lang);
                }
            },
            body: {
                get: function () {
                    var bodies = this.$body;
                    return bodies[this.lang] || '';
                },
                set: function (value) {
                    types.setSubLangText(this.xml, this._NS, 'body', value, this.lang);
                }
            },
            attention: types.boolSub('urn:xmpp:attention:0', 'attention'),
            chatState: types.enumSub('http://jabber.org/protocol/chatstates', [
                'active', 'composing', 'paused', 'inactive', 'gone'
            ]),
            replace: types.subAttribute('urn:xmpp:message-correct:0', 'replace', 'id'),
            requestReceipt: types.boolSub('urn:xmpp:receipts', 'request'),
            receipt: types.subAttribute('urn:xmpp:receipts', 'received', 'id')
        }
    });
};
