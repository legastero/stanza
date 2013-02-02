exports.Error = function (stanza) {
    var NS = 'jabber:client',
        errNS = 'urn:ietf:params:xml:ns:xmpp-stanzas';

    stanza.define('error', 'error', NS, {
        condition: {
            xml: function (xml, value) {
                return xml.c(value, {xmlns: errNS}).up();
            }
        },
        code: {
            xml: function (xml, value) {
                return xml.attr('code', value);
            },
            json: function (json, xml) {
                json.code = xml.attr('code');
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
        by: {
            xml: function (xml, value) {
                return xml.attr('by', value);
            },
            json: function (json, xml) {
                json.by = xml.attr('by');
                return json;
            }
        },
        text: {
            xml: function (xml, value) {
                return xml.c('text', {xmlns: errNS}).t(value).up();
            },
            json: function (json, xml) {
                json.text = xml.getChildText('text', errNS);
                return json;
            }
        }
    });

    var ext = {
        xml: function (xml, value) {
            value._ = 'error';
            return xml.cnode(stanza.xml(value)).up();
        },
        json: function (json, xml) {
            var errXML = xml.getChild('error', NS);
            if (errXML) {
                json.error = stanza.json(xml.getChild('error', NS));
                delete json.error._;
            }
            return json;
        }
    };

    stanza.extend('message', 'error', ext);
    stanza.extend('presence', 'error', ext);
    stanza.extend('iq', 'error', ext);
};
