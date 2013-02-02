var _ = require('underscore');

exports.Iq = function (stanza) {
    stanza.define('iq', 'iq', 'jabber:client', {
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
        payload: {
            xml: function (xml, value) {
                return xml.cnode(stanza.xml(value)).up();
            },
            json: function (json, xml) {
                json.payload = stanza.json(xml.children[0]);
                return json;
            }
        }
    });
};
