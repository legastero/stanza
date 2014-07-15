'use strict';

var stanza = require('jxt');
var util = require('./util');


module.exports = stanza.define({
    name: 'message',
    namespace: 'jabber:client',
    element: 'message',
    topLevel: true,
    fields: {
        lang: stanza.langAttribute(),
        id: stanza.attribute('id'),
        to: util.jidAttribute('to', true),
        from: util.jidAttribute('from', true),
        type: stanza.attribute('type', 'normal'),
        thread: stanza.subText('jabber:client', 'thread'),
        parentThread: stanza.subAttribute('jabber:client', 'thread', 'parent'),
        subject: stanza.subText('jabber:client', 'subject'),
        $body: {
            get: function () {
                return stanza.getSubLangText(this.xml, this._NS, 'body', this.lang);
            }
        },
        body: {
            get: function () {
                var bodies = this.$body;
                return bodies[this.lang] || '';
            },
            set: function (value) {
                stanza.setSubLangText(this.xml, this._NS, 'body', value, this.lang);
            }
        },
        attention: stanza.boolSub('urn:xmpp:attention:0', 'attention'),
        chatState: util.enumSub('http://jabber.org/protocol/chatstates', [
            'active', 'composing', 'paused', 'inactive', 'gone'
        ]),
        replace: stanza.subAttribute('urn:xmpp:message-correct:0', 'replace', 'id'),
        requestReceipt: stanza.boolSub('urn:xmpp:receipts', 'request'),
        receipt: stanza.subAttribute('urn:xmpp:receipts', 'received', 'id')
    }
});
