exports.Roster = function (stanza) {
    var NS = 'jabber:iq:roster';

    stanza.define('roster', 'query', NS, {
        ver: {
            xml: function (xml, value) {
                return xml.attr('code', value);
            },
            json: function (json, xml) {
                json.ver = xml.attr('ver');
                return json;
            }
        },
        items: {
            xml: function (xml, value) {
                value.forEach(function (item) {
                    var itemxml = xml.cnode('item');
                    itemxml.attr('name', item.name);
                    itemxml.attr('jid', item.jid);
                    itemxml.attr('approved', item.approved);
                    itemxml.attr('ask', item.ask);
                    itemxml.attr('subscription', item.subscription);
                    var groups = item.groups;
                    if (groups) {
                        groups.forEach(function (group) {
                            itemxml.c('group', {xmlns: NS}).t(group).up();
                        });
                    }
                    itemxml.up();
                });
                return xml;
            },
            json: function (json, xml) {
                json.items = [];
                xml.children.forEach(function (child) {
                    var item = {};
                    item.name = child.attr('name');
                    item.jid = child.attr('jid');
                    item.approved = child.attr('approved');
                    item.ask = child.attr('ask');
                    item.subscription = child.attr('subscription');
                    item.groups = [];
                    child.children.forEach(function (group) {
                        item.groups.push(group.getText());
                    });
                    json.items.push(item);
                });
                return json;
            }
        }
    });
};
