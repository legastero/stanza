exports.Message = function (stanza) {
    var NS = 'jabber:client';
    stanza.define('message', 'message', NS, {
        to: {
            xml: function (xml, value) {
                return xml.attr('to', value);
            },
            json: function (json, xml) {
                json.to = xml.attr('to');
                return json;
            } 
        },
        from: {
            xml: function (xml, value) {
                return xml.attr('from', value);
            },
            json: function (json, xml) {
                json.from = xml.attr('from');
                return json;
            } 
        },
        type: {
            default: 'normal',
            xml: function (xml, value) {
                return xml.attr('type', value);
            },
            json: function (json, xml) {
                json.type = xml.attr('type');
                return json;
            } 
        },
        id: {
            xml: function (xml, value) {
                return xml.attr('id', value);
            },
            json: function (json, xml) {
                json.id = xml.attr('id');
                return json;
            } 
        },
        body: {
            xml: function (xml, value) {
                return xml.c('body').t(value).up();
            },
            json: function (json, xml) {
                json.body = xml.getChildText('body', NS);
                return json;
            } 
        },
        subject: {
            xml: function (xml, value) {
                return xml.c('subject').t(value).up();
            },
            json: function (json, xml) {
                json.subject = xml.getChildText('subject', NS);
                return json;
            } 
        },
        thread: {
            xml: function (xml, value) {
                if (typeof value === 'string') {
                    return xml.c('thread').t(value).up();
                } else {
                    var thread = xml.c('thread').t(value['value']);
                    if (value['parent']) {
                        thread.attr('parent', value['parent']);
                    }
                    return thread.up();
                }
            },
            json: function (json, xml) {
                var threadXML = xml.getChild('thread', NS);
                if (threadXML) {
                    var thread = threadXML.getText();
                    var parent = threadXML.attr('parent');
                    if (parent) {
                        json.thread = {
                            value: thread,
                            parent: parent
                        };
                    } else {
                        json.thread = thread
                    }
                }
                return json;
            }
        },
        chatState: {
            xml: function (xml, value) {
                return xml.c(value, {xmlns: 'http://jabber.org/protocol/chatstates'}).up();
            },
            json: function (json, xml) {
                var names = ['active', 'inactive', 'gone', 'composing', 'paused'];
                for (var i = 0; i < names.length; i++) {
                    var csXML = xml.getChild(names[i], 'http://jabber.org/protocol/chatstates');
                    if (csXML) {
                        json.chatState = names[i];
                        break;
                    }
                }
                return json;
            }
        },
        nick: {
            xml: function (xml, value) {
                return xml.c('nick', {xmlns: 'http://jabber.org/protocol/nick'}).t(value).up();
            },
            json: function (json, xml) {
                json.nick = xml.getChildText('nick', 'http://jabber.org/protocol/nick');
                return json;
            } 
        }
    });
};
