exports.Presence = function (stanza) {
    var NS = 'jabber:client';
    stanza.define('presence', 'presence', NS, {
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
            xml: function (xml, value) {
                if (value === 'unavailable') {
                    return xml.attr('type', value);
                }
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
            },
        },
        show: {
            xml: function (xml, value) {
                return xml.c('show').t(value).up();
            },
            json: function (json, xml) {
                json.show = xml.getChildText('show', NS);
                return json;
            }
        },
        priority: {
            xml: function (xml, value) {
                return xml.c('priority').t(value).up();
            },
            json: function (json, xml) {
                json.priority = xml.getChildText('priority', NS);
                return json;
            }

        },
        status: {
            xml: function (xml, value) {
                return xml.c('status').t(value).up();
            },
            json: function (json, xml) {
                json.status = xml.getChildText('status', NS);
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
        },
        caps: {
            xml: function (xml, value) {
                var caps = xml.c('c', {xmlns: 'http://jabber.org/protocol/caps'});
                var attrs = ['hash', 'node', 'ver', 'ext'];
                attrs.forEach(function (attr) {
                    if (value[attr] !== undefined) {
                        caps.attr(attr, value[attr]);
                    }
                });
                return caps.up();
            },
            json: function (json, xml) {
                var caps = xml.getChild('c', 'http://jabber.org/protocol/caps');
                if (caps) {
                    var attrs = ['hash', 'node', 'ver', 'ext'];
                    json.caps = {};
                    attrs.forEach(function (attr) {
                        var val = caps.attr(attr);
                        json.caps[attr] = val;
                    });
                }
                return json;
            }
        },
        vCardAvatar: {
            xml: function (xml, value) {
                var vcard = xml.c('x', {xmlns: 'vcard-temp:x:update'});
                if (value !== false) {
                    vcard.c('photo').t(value);
                }
                return vcard.up();
            },
            json: function (json, xml) {
                var vcardNS = 'vcard-temp:x:update';
                var vcard = xml.getChild('x', vcardNS);
                if (vcard) {
                    json.vCardAvatar = vcard.getChildText('photo', vcardNS);
                }
                return json;
            }
        }
    });
};
